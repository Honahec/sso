from urllib.parse import urlparse

from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.views.generic import TemplateView
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.viewsets import GenericViewSet, ModelViewSet

from .models import Permission, User
from .serializers import UserAuthSerializer, UserSettingsSerializer


def _get_django_request(request):
    return getattr(request, '_request', request)


class CustomJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        token_version = validated_token.get('ver')
        if token_version != user.token_version:
            raise AuthenticationFailed('Token version mismatch')
        return user


class UserAuthViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    authentication_classes = (CustomJWTAuthentication,)
    search_fields = ['username', 'email']

    def get_queryset(self):
        return User.objects.order_by('id')

    def _create_token_payload(self, user: User) -> dict:
        refresh = RefreshToken.for_user(user)
        refresh['ver'] = user.token_version
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

    @action(
        detail=False,
        methods=['post'],
        url_path='login',
        permission_classes=[AllowAny],
    )
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': 'Invalid username or password'}, status=400)

        django_request = _get_django_request(request)
        user = authenticate(django_request, username=username, password=password)

        if user is None or not user.is_active:
            return Response({'error': 'Invalid username or password'}, status=400)

        auth_login(django_request, user)
        return Response(self._create_token_payload(user))

    @action(
        detail=False,
        methods=['post'],
        url_path='register',
        permission_classes=[AllowAny],
    )
    def register(self, request):
        serializer = UserAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user_permission = Permission.objects.create()
        user = User.objects.create_user(
            username=data['username'],
            email=data['email'],
            permission=user_permission,
            password=data['password'],
        )

        django_request = _get_django_request(request)
        auth_login(django_request, user)

        return Response(self._create_token_payload(user))

    @action(
        detail=False,
        methods=['post'],
        url_path='logout',
    )
    def logout(self, request):
        django_request = _get_django_request(request)
        refresh_token = request.data.get('refresh')

        try:
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            return Response({'error': 'Invalid token'}, status=400)

        user = request.user
        if getattr(user, 'is_authenticated', False):
            user.token_version += 1
            user.save(update_fields=['token_version'])

        auth_logout(django_request)
        return Response({'status': 'Logged out successfully'})
class UserSettingsViewSet(GenericViewSet):
    permission_classes = [IsAuthenticated]
    authentication_classes = (CustomJWTAuthentication,)

    def _get_user(self, request):
        user = request.user
        if not getattr(user, 'is_authenticated', False):
            raise AuthenticationFailed('Invalid token')
        return user

    @action(
        detail=False,
        methods=['get'],
        url_path='info',
    )
    def get_info(self, request):
        try:
            user = self._get_user(request)
        except AuthenticationFailed as exc:
            return Response({'error': str(exc)}, status=400)

        serializer = UserSettingsSerializer(user)
        return Response(serializer.data)

    @action(
        detail=False,
        methods=['post'],
        url_path='change-password',
    )
    def change_password(self, request):
        try:
            user = self._get_user(request)
        except AuthenticationFailed as exc:
            return Response({'error': str(exc)}, status=400)

        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({'error': 'Both old and new passwords are required'}, status=400)

        if not user.check_password(old_password):
            return Response({'error': 'Old password is incorrect'}, status=400)

        user.set_password(new_password)
        user.save()
        return Response({'status': 'Password changed successfully'})

    @action(
        detail=False,
        methods=['post'],
        url_path='change-email',
    )
    def change_email(self, request):
        try:
            user = self._get_user(request)
        except AuthenticationFailed as exc:
            return Response({'error': str(exc)}, status=400)

        new_email = request.data.get('new_email')
        if not new_email:
            return Response({'error': 'New email is required'}, status=400)

        if User.objects.filter(email=new_email).exclude(pk=user.pk).exists():
            return Response({'error': 'Email already exists'}, status=400)

        user.email = new_email
        user.save(update_fields=['email'])
        return Response({'status': 'Email changed successfully'})


class PortalView(TemplateView):
    template_name = 'sso_auth/app.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        request = self.request
        next_url = request.GET.get('next', '')

        if next_url:
            parsed = urlparse(next_url)
            if parsed.scheme or parsed.netloc:
                # Disallow absolute URLs to prevent open redirects
                next_url = ''
            elif not next_url.startswith('/'):
                next_url = f'/{next_url}'

        user = request.user if request.user.is_authenticated else None
        permission_info = None
        if user and getattr(user, 'permission', None):
            permission_info = {
                'admin_user': user.permission.admin_user,
            }

        portal_context = {
            'nextUrl': next_url,
            'sessionUser': {
                'username': user.username,
                'email': user.email,
                'permission': permission_info,
            } if user else None,
            'isAuthenticated': bool(user),
        }

        context.update({
            'next_url': next_url,
            'session_user': portal_context['sessionUser'],
            'portal_context': portal_context,
        })
        return context
