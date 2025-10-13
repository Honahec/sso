from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.

class Permission(models.Model):
    admin_user = models.BooleanField(default=False)

class User(AbstractUser):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    permission = models.OneToOneField(Permission, on_delete=models.PROTECT, null=True, blank=True)
    