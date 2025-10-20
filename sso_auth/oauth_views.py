from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.urls import reverse_lazy
from django.http import JsonResponse
from django.views import View
from oauth2_provider import views as oauth_views
from oauth2_provider.models import AccessToken


class CreateApplicationsPermissionRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    """Restrict access to users who can manage OAuth applications."""

    raise_exception = True
    login_url = reverse_lazy("sso_auth_portal")

    def test_func(self):
        user = self.request.user
        permission = getattr(user, "permission", None)
        return bool(permission and getattr(permission, "create_applications", False))


class ProtectedApplicationListView(
    CreateApplicationsPermissionRequiredMixin, oauth_views.ApplicationList
):
    pass


class ProtectedApplicationRegistrationView(
    CreateApplicationsPermissionRequiredMixin, oauth_views.ApplicationRegistration
):
    pass


class ProtectedApplicationDetailView(
    CreateApplicationsPermissionRequiredMixin, oauth_views.ApplicationDetail
):
    pass


class ProtectedApplicationDeleteView(
    CreateApplicationsPermissionRequiredMixin, oauth_views.ApplicationDelete
):
    pass


class ProtectedApplicationUpdateView(
    CreateApplicationsPermissionRequiredMixin, oauth_views.ApplicationUpdate
):
    pass


class UserInfoView(View):
    """
    API endpoint to return user information based on OAuth2 access token.
    Returns username, email, and permissions based on the granted scopes.
    
    All returned information is READ-ONLY:
    - username: User's username (read-only)
    - email: User's email address (read-only)
    - permissions: User's permissions (read-only)
    
    This endpoint only supports GET requests and does not allow any modifications.
    """

    def get(self, request, *args, **kwargs):
        # Extract the Bearer token from Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Missing or invalid Authorization header'}, status=401)
        
        token_string = auth_header[7:]  # Remove 'Bearer ' prefix
        
        # Find the AccessToken object
        try:
            access_token = AccessToken.objects.select_related('user').get(token=token_string)
        except AccessToken.DoesNotExist:
            return JsonResponse({'error': 'Invalid token'}, status=401)
        
        # Check if token is expired
        if access_token.is_expired():
            return JsonResponse({'error': 'Token expired'}, status=401)
        
        # Get the user (resource owner)
        user = access_token.user
        
        # Get the scopes from the access token
        scopes = access_token.scope.split() if access_token.scope else []
        
        # Build response based on scopes
        user_info = {
            'sub': str(user.id),  # Subject (user ID) is always included
        }
        
        # Add username if 'username' scope is granted
        if 'username' in scopes:
            user_info['username'] = user.username
        
        # Add email if 'email' scope is granted
        if 'email' in scopes:
            user_info['email'] = user.email
        
        # Add permissions if 'permissions' scope is granted (read-only)
        if 'permissions' in scopes:
            permission = getattr(user, 'permission', None)
            if permission:
                user_info['permissions'] = {
                    'admin_user': permission.admin_user,
                    'create_applications': permission.create_applications,
                }
            else:
                user_info['permissions'] = {
                    'admin_user': False,
                    'create_applications': False,
                }
        
        return JsonResponse(user_info)
