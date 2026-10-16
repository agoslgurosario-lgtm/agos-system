from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from .utils import generate_otp, send_otp_email, store_otp, verify_otp, is_verified, clear_verified
from django.contrib.auth import authenticate
from .models import User
from apps.users.permissions import IsAdmin
from .serializers import UserSerializer, RegisterSerializer
from apps.audit_logs.utils import log_action
import json
from django.conf import settings
from django.utils import timezone
from .throttles import LoginRateThrottle, OTPRateThrottle
import time
import threading
from axes.models import AccessAttempt
from rest_framework.throttling import ScopedRateThrottle


def is_locked_out(email, ip):
    return AccessAttempt.objects.filter(
        username=email, ip_address=ip, failures_since_start__gte=settings.AXES_FAILURE_LIMIT
    ).exists()


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        ip = request.META.get('REMOTE_ADDR')
        if is_locked_out(email, ip):
            return Response(
                {'error': 'Too many failed attempts. Please try again later or contact your administrator.'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = authenticate(request, email=email, password=password)

        if user:
            if user.status == 'Inactive':
                return Response(
                    {'error': 'Account is inactive'},
                    status=status.HTTP_403_FORBIDDEN
                )

            refresh = RefreshToken.for_user(user)
            access_token  = str(refresh.access_token)
            refresh_token = str(refresh)
            user_data     = UserSerializer(user).data

            log_action(
                user=user,
                action='Login',
                ip_address=request.META.get('REMOTE_ADDR')
            )

            is_secure = not settings.DEBUG
            cookie_samesite = 'None' if is_secure else 'Lax'

            response = Response({
                'user': user_data
            })

            response.set_cookie(
                key='access_token', value=access_token, max_age=7*24*60*60,
                httponly=True, secure=is_secure, samesite=cookie_samesite, path='/',
            )
            response.set_cookie(
                key='refresh_token', value=refresh_token, max_age=7*24*60*60,
                httponly=True, secure=is_secure, samesite=cookie_samesite, path='/',
            )
            response.set_cookie(
                key='user', value=json.dumps(dict(user_data)), max_age=7*24*60*60,
                httponly=False, secure=is_secure, samesite=cookie_samesite, path='/',
            )

            return response

        return Response(
            {'error': 'Email or password is incorrect. Check your credentials and try again.'},
            status=status.HTTP_401_UNAUTHORIZED
        )


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except Exception:
                pass

        try:
            log_action(user=request.user, action='Logout', ip_address=request.META.get('REMOTE_ADDR'))
        except Exception:
            pass

        response = Response({'message': 'Logged out successfully'})
        response.delete_cookie('access_token', path='/')
        response.delete_cookie('refresh_token', path='/')
        response.delete_cookie('user', path='/')
        return response


class MeView(APIView):
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UserListView(generics.ListCreateAPIView):
    queryset = User.objects.all().order_by('user_id')
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RegisterSerializer
        return UserSerializer
    
    def perform_create(self, serializer):
        if serializer.validated_data.get('user_role') == 'Admin':
            User.objects.filter(user_role='Admin', status='Active').update(status='Inactive')

        user = serializer.save()
        log_action(
            user=self.request.user,
            action='Created User',
            affected_table='tbl_user',
            new_value=f"email: {user.email}, role: {user.user_role}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = 'user_id'
    permission_classes = [IsAdmin]

    # log actions
    def perform_update(self, serializer):
        old_status = serializer.instance.status
        instance = serializer.instance

        is_deactivating_admin = (
            instance.user_role == 'Admin'
            and old_status == 'Active'
            and serializer.validated_data.get('status') == 'Inactive'
        )
        if is_deactivating_admin:
            other_active_admin_exists = User.objects.filter(
                user_role='Admin', status='Active'
            ).exclude(pk=instance.pk).exists()
            if not other_active_admin_exists:
                raise ValidationError({
                    'error': 'Cannot deactivate this Admin account. There must always be at least one active Admin — activate another Admin first.'
                })

        is_reactivating_admin = (
            instance.user_role == 'Admin'
            and old_status == 'Inactive'
            and serializer.validated_data.get('status') == 'Active'
        )
        if is_reactivating_admin:
            User.objects.filter(user_role='Admin', status='Active').exclude(pk=instance.pk).update(status='Inactive')

        user = serializer.save()
        log_action(
            user=self.request.user,
            action='Updated User',
            affected_table='tbl_user',
            old_value=f"status: {old_status}",
            new_value=f"status: {user.status}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )
    
    def perform_destroy(self, instance):
        log_action(
            user=self.request.user,
            action='Deleted User',
            affected_table='tbl_user',
            old_value=f"email: {instance.email}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )
        instance.delete()


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [OTPRateThrottle]

    MIN_RESPONSE_SECONDS = 0.3

    def post(self, request):
        start = time.monotonic()
        email = request.data.get('email')
        if not email:
            return Response(
                {'email': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
            otp = generate_otp()
            store_otp(email, otp)
            threading.Thread(
                target=send_otp_email, args=(email, otp), daemon=True
            ).start()
        except User.DoesNotExist:
            pass

        elapsed = time.monotonic() - start
        remaining = self.MIN_RESPONSE_SECONDS - elapsed
        if remaining > 0:
            time.sleep(remaining)

        return Response(
            {'message': 'If an account exists with this email, an OTP has been sent.'},
            status=status.HTTP_200_OK
        )


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')

        if not email or not code:
            return Response(
                {'error': 'Email and code are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if verify_otp(email, code):
            return Response(
                {'message': 'Code verified successfully'},
                status=status.HTTP_200_OK
            )
        
        return Response(
            {'code': 'That code is incorrect or has expired'},
            status=status.HTTP_400_BAD_REQUEST
        )


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not is_verified(email):
            return Response(
                {'error': 'Email not verified. Please complete OTP verification first'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            user = User.objects.get(email=email)
            user.set_password(password)
            user.must_change_password = False
            user.save()
            clear_verified(email)
            return Response(
                {'message': 'Password reset successfully'},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class InitialSetupView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Check if setup is still needed"""
        admin_exists = User.objects.filter(user_role='Admin').exists()
        return Response({'setup_required': not admin_exists})

    def post(self, request):
        """Create first admin — only works if no admin exists yet"""
        if User.objects.filter(user_role='Admin').exists():
            return Response(
                {'error': 'Setup already completed. An admin account already exists.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save(user_role='Admin')
            log_action(
                user=user,
                action='Initial Setup - Created Admin',
                affected_table='tbl_user',
                new_value=f"email: {user.email}, role: {user.user_role}",
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response(
                {'message': f'Admin account created for {user.first_name} {user.last_name}.'},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class TokenRefreshView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response({'error': 'No refresh token provided'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            token = RefreshToken(refresh_token)
            new_access = str(token.access_token)
        except Exception:
            return Response({'error': 'Invalid or expired refresh token'}, status=status.HTTP_401_UNAUTHORIZED)

        is_secure = not settings.DEBUG
        cookie_samesite = 'None' if is_secure else 'Lax'
        response = Response({'access': new_access})
        response.set_cookie(
            key='access_token', value=new_access, max_age=7*24*60*60,
            httponly=True, secure=is_secure, samesite=cookie_samesite, path='/',
        )
        return response


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response(
                {'error': 'Old password and new password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user

        if not user.check_password(old_password):
            return Response(
                {'old_password': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.must_change_password = False
        user.save()

        return Response({'message': 'Password changed successfully'})
    

class MobileLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, email=email, password=password)

        if not user:
            return Response(
                {'error': 'Email or password is incorrect. Check your credentials and try again.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if user.status == 'Inactive':
            return Response(
                {'error': 'This account is inactive. Please try another account.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if user.user_role != 'Barangay':
            return Response(
                {'error': 'This app is for Barangay personnel accounts only'},
                status=status.HTTP_403_FORBIDDEN
            )

        refresh = RefreshToken.for_user(user)
        access_token  = str(refresh.access_token)
        refresh_token = str(refresh)
        user_data     = UserSerializer(user).data

        log_action(
            user=user,
            action='Login',
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'access': access_token,
            'refresh': refresh_token,
            'user': user_data
        })


class MobileTokenRefreshView(APIView):
    """
    Refresh endpoint for mobile — reads the refresh token from the
    request body instead of a cookie.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'No refresh token provided'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            token = RefreshToken(refresh_token)
            new_access = str(token.access_token)
            return Response({'access': new_access})
        except Exception:
            return Response({'error': 'Invalid or expired refresh token'}, status=status.HTTP_401_UNAUTHORIZED)
        

class MobileLogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()

            log_action(
                user=request.user,
                action='Logout',
                ip_address=request.META.get('REMOTE_ADDR')
            )

            return Response({'message': 'Logged out successfully'})

        except Exception:
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_400_BAD_REQUEST
            )


class AgreePrivacyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request.user.privacy_agreed_at = timezone.now()
        request.user.save(update_fields=['privacy_agreed_at'])

        log_action(
            user=request.user,
            action='Agreed to Privacy Notice',
            affected_table='tbl_user',
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({'user': UserSerializer(request.user).data})


class WSTokenView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'ws_token'

    def get(self, request):
        raw_token = request.COOKIES.get('access_token')
        if not raw_token:
            return Response({'error': 'Not authenticated'}, status=401)
        return Response({'token': raw_token})