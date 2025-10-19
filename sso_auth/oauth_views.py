from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.urls import reverse_lazy
from oauth2_provider import views as oauth_views


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
