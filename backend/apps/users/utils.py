import random
import secrets
import string
from django.core.mail import send_mail
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone


def generate_otp():
    return ''.join(secrets.choice(string.digits) for _ in range(6))

def send_otp_email(email, otp):
    subject = 'Password Reset Code'
    message = f'Your password reset code is: {otp}. It expires in 10 minutes.'
    send_mail(
        subject,
        message,
        settings.EMAIL_HOST_USER,
        [email],
        fail_silently=False,
    )

def store_otp(email, otp):
    # Store OTP in cache for 10 minutes
    cache.set(f'otp_{email}', otp, timeout=600)

def verify_otp(email, otp):
    stored_otp = cache.get(f'otp_{email}')
    if stored_otp and stored_otp == otp:
        cache.delete(f'otp_{email}')
        # Mark email as verified for password reset
        cache.set(f'verified_{email}', True, timeout=600)
        return True
    return False


def is_verified(email):
    return cache.get(f'verified_{email}') is True


def clear_verified(email):
    cache.delete(f'verified_{email}')


def send_credentials_email(user, password):
    login_url = f'{settings.FRONTEND_URL}/login'

    context = {
        'user': user,
        'password': password,
        'login_url': login_url,
        'current_year': timezone.now().year,
    }

    subject = 'Your AGOS Account Credentials'
    html_message = render_to_string('emails/base_email.html', context)

    # Plain-text fallback for clients that block/strip HTML
    text_message = (
        f'An account has been created for you on AGOS.\n\n'
        f'Name: {user.first_name} {user.last_name}\n'
        f'Role: {user.user_role}\n'
        f'Email: {user.email}\n'
        f'Temporary Password: {password}\n\n'
        f'Login here: {login_url}\n\n'
        f'You will be required to change your password on first login.'
    )

    email = EmailMultiAlternatives(
        subject,
        text_message,
        settings.EMAIL_HOST_USER,
        [user.email],
    )
    email.attach_alternative(html_message, 'text/html')
    email.send(fail_silently=False)