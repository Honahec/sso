from rest_framework import serializers

from sso_auth.models import Permission, User


class AdminPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["admin_user", "create_applications"]
        extra_kwargs = {
            "admin_user": {"required": False},
            "create_applications": {"required": False},
        }


class AdminUserSerializer(serializers.ModelSerializer):
    permission = AdminPermissionSerializer(allow_null=True, required=False)

    class Meta:
        model = User
        fields = ["id", "username", "email", "is_active", "permission"]
        read_only_fields = ["id", "username"]
        extra_kwargs = {
            "email": {"required": False},
            "is_active": {"required": False},
        }

    def update(self, instance, validated_data):
        permission_data = validated_data.pop("permission", None)
        email = validated_data.get("email")
        is_active = validated_data.get("is_active")

        updated_fields = []
        if email is not None:
            instance.email = email
            updated_fields.append("email")
        if is_active is not None:
            instance.is_active = is_active
            updated_fields.append("is_active")

        if permission_data is not None:
            permission = instance.permission
            if permission is None:
                permission = Permission.objects.create(
                    admin_user=permission_data.get("admin_user", False),
                    create_applications=permission_data.get("create_applications", False),
                )
                instance.permission = permission
                updated_fields.append("permission")
            else:
                if "admin_user" in permission_data:
                    permission.admin_user = permission_data["admin_user"]
                if "create_applications" in permission_data:
                    permission.create_applications = permission_data["create_applications"]
                permission.save()

        if updated_fields:
            instance.save(update_fields=updated_fields)
        return instance


class AdminCreateUserSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    admin_user = serializers.BooleanField(required=False, default=False)
    create_applications = serializers.BooleanField(required=False, default=False)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value

    def create(self, validated_data):
        permission = Permission.objects.create(
            admin_user=validated_data.get("admin_user", False),
            create_applications=validated_data.get("create_applications", False),
        )
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            permission=permission,
        )
        return user
