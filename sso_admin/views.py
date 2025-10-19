from urllib.parse import urlencode

from django.db.models import Q
from django.http import HttpResponseForbidden, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.views.generic import TemplateView
from rest_framework import status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from sso_auth.models import User

from .permissions import IsPortalAdmin
from .serializers import AdminCreateUserSerializer, AdminUserSerializer


class AdminPermissionRequiredMixin:
	"""Ensure the request user has portal admin permission."""

	redirect_url = "sso_auth_portal"

	def dispatch(self, request, *args, **kwargs):
		if not request.user.is_authenticated:
			login_url = reverse(self.redirect_url)
			query = urlencode({"next": request.get_full_path()})
			return HttpResponseRedirect(f"{login_url}?{query}")

		permission = getattr(request.user, "permission", None)
		if not permission or not permission.admin_user:
			return HttpResponseForbidden("You do not have access to the admin portal.")

		return super().dispatch(request, *args, **kwargs)


class AdminPortalView(AdminPermissionRequiredMixin, TemplateView):
	template_name = "sso_admin/app.html"

	def get_context_data(self, **kwargs):
		context = super().get_context_data(**kwargs)
		user = self.request.user
		permission = getattr(user, "permission", None)

		portal_context = {
			"sessionUser": {
				"id": user.id,
				"username": user.username,
				"email": user.email,
				"permission": {
					"admin_user": getattr(permission, "admin_user", False),
					"create_applications": getattr(permission, "create_applications", False),
				},
			},
		}

		context.update({
			"page_title": _("SSO Admin Portal"),
			"portal_context": portal_context,
		})
		return context


class AdminUserViewSet(viewsets.ViewSet):
	authentication_classes = [SessionAuthentication]
	permission_classes = [IsAuthenticated, IsPortalAdmin]

	def get_queryset(self):
		queryset = User.objects.select_related("permission").order_by("id")
		search = self.request.query_params.get("search")
		if search:
			queryset = queryset.filter(
				Q(username__icontains=search) | Q(email__icontains=search)
			)
		return queryset

	def list(self, request):
		serializer = AdminUserSerializer(self.get_queryset(), many=True)
		return Response({"results": serializer.data})

	def create(self, request):
		serializer = AdminCreateUserSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()
		response_serializer = AdminUserSerializer(user)
		return Response(response_serializer.data, status=status.HTTP_201_CREATED)

	def partial_update(self, request, pk=None):
		user = get_object_or_404(User.objects.select_related("permission"), pk=pk)
		serializer = AdminUserSerializer(user, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response(AdminUserSerializer(user).data)
