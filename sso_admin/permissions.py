from rest_framework.permissions import BasePermission


class IsPortalAdmin(BasePermission):
    """Allow access only to users marked as admin in the custom Permission model."""

    def has_permission(self, request, view):
        user = request.user
        if not getattr(user, "is_authenticated", False):
            return False
        permission = getattr(user, "permission", None)
        return bool(permission and getattr(permission, "admin_user", False))
