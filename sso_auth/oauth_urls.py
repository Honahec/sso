from django.urls import path
from oauth2_provider import views as oauth_views
from oauth2_provider.urls import base_urlpatterns, oidc_urlpatterns

from .oauth_views import (
    ProtectedApplicationDeleteView,
    ProtectedApplicationDetailView,
    ProtectedApplicationListView,
    ProtectedApplicationRegistrationView,
    ProtectedApplicationUpdateView,
    UserInfoView,
)


app_name = "oauth2_provider"


management_urlpatterns = [
    path("applications/", ProtectedApplicationListView.as_view(), name="list"),
    path(
        "applications/register/",
        ProtectedApplicationRegistrationView.as_view(),
        name="register",
    ),
    path(
        "applications/<slug:pk>/",
        ProtectedApplicationDetailView.as_view(),
        name="detail",
    ),
    path(
        "applications/<slug:pk>/delete/",
        ProtectedApplicationDeleteView.as_view(),
        name="delete",
    ),
    path(
        "applications/<slug:pk>/update/",
        ProtectedApplicationUpdateView.as_view(),
        name="update",
    ),
    path(
        "authorized_tokens/",
        oauth_views.AuthorizedTokensListView.as_view(),
        name="authorized-token-list",
    ),
    path(
        "authorized_tokens/<slug:pk>/delete/",
        oauth_views.AuthorizedTokenDeleteView.as_view(),
        name="authorized-token-delete",
    ),
]

# User info endpoint
userinfo_urlpatterns = [
    path("userinfo/", UserInfoView.as_view(), name="userinfo"),
]

urlpatterns = base_urlpatterns + management_urlpatterns + oidc_urlpatterns + userinfo_urlpatterns
