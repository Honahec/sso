from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.urls import reverse_lazy
from django.http import JsonResponse
from oauth2_provider import views as oauth_views
from oauth2_provider.views import ProtectedResourceView


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


class UserInfoView(ProtectedResourceView):
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
        # Get the token from the request (validated by ProtectedResourceView)
        token = request.resource_owner
        
        # Get the scopes from the access token
        access_token = request.auth
        scopes = access_token.scope.split() if access_token and access_token.scope else []
        
        # Build response based on scopes
        user_info = {
            'sub': str(token.id),  # Subject (user ID) is always included
        }
        
        # Add username if 'username' scope is granted
        if 'username' in scopes:
            user_info['username'] = token.username
        
        # Add email if 'email' scope is granted
        if 'email' in scopes:
            user_info['email'] = token.email
        
        # Add permissions if 'permissions' scope is granted (read-only)
        if 'permissions' in scopes:
            permission = getattr(token, 'permission', None)
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
