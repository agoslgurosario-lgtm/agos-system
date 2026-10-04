from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.exceptions import PermissionDenied

SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')


class CookieJWTAuthentication(JWTAuthentication):

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        raw_token = request.COOKIES.get('access_token')
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
        except (InvalidToken, TokenError):
            return None

        if request.method not in SAFE_METHODS and request.headers.get('X-Requested-With') != 'agos-web':
            raise PermissionDenied('CSRF check failed.')
        return self.get_user(validated_token), validated_token