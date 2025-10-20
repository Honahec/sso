# SSO (Single Sign-On) System

A Django-based Single Sign-On system with OAuth2 support and React frontend.

## Quick Start

### Frontend

```bash
cd frontend
pnpm install
pnpm build
```

### Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Collect staticfiles (You must build Frontend first)
python manage.py collectstatic

# Start server
python manage.py runserver
```

### Create First User

You can use Django shell to create the first user

```bash
from sso_auth.models import User, Permission

permission = Permission.objects.create(
    admin_user = True,
    create_applications = True,
)

user = User.objects.create_user(
    username = "xxx",
    email = "xxx",
    password = "xxx",
    permission = permission,
)
user.save()
```

## Authorization Flow

1. **Request authorization**:

```
GET /oauth/authorize/?client_id=<client_id>&response_type=code&redirect_uri=<redirect_uri>&scope=username email permissions
```

2. **Exchange code for token**:

```bash
curl -X POST http://localhost:8000/oauth/token/ \
  -d "grant_type=authorization_code" \
  -d "code=<code>" \
  -d "redirect_uri=<redirect_uri>" \
  -d "client_id=<client_id>" \
  -d "client_secret=<client_secret>"
```

## SCOPE

Refer to [SCOPE.md](/SCOPE.md) for a list of all scopes you can authorize.
