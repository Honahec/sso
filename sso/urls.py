"""
URL configuration for sso project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView
from rest_framework.routers import DefaultRouter
from sso_auth.views import UserAuthViewSet, UserSettingsViewSet, PortalView
from sso_admin.views import AdminPortalView, AdminUserViewSet

router = DefaultRouter()
router.include_root_view = False
router.register(r'user', UserAuthViewSet, basename='user')
router.register(r'user-settings', UserSettingsViewSet, basename='user-settings')
router.register(r'admin/users', AdminUserViewSet, basename='sso-admin-users')

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('', RedirectView.as_view(url='/portal/', permanent=True)),
    path('', include(router.urls)),
    path('oauth/', include('sso_auth.oauth_urls', namespace='oauth2_provider')),
    path('portal/', PortalView.as_view(), name='sso_auth_portal'),
    path('admin/', AdminPortalView.as_view(), name='sso_admin_portal'),
]
