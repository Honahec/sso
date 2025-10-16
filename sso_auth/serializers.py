from rest_framework import serializers

from .models import Permission, User

class UserAuthSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['admin_user']


class UserSettingsSerializer(serializers.ModelSerializer):
    permission = PermissionSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'permission']
        read_only_fields = ['username', 'permission']
