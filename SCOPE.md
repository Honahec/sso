# OAuth2 Scopes

## Available Scopes

| Scope         | Description                                                      | Access Type |
| ------------- | ---------------------------------------------------------------- | ----------- |
| `username`    | Access to username                                               | Read-only   |
| `email`       | Access to email address                                          | Read-only   |
| `permissions` | Access to user permissions (`admin_user`, `create_applications`) | Read-only   |

## UserInfo Endpoint

**URL**: `/oauth/userinfo/`

**Method**: `GET`

**Authentication**: Bearer Token

**Example Request**:

```bash
curl -H "Authorization: Bearer <access_token>" \
  http://localhost:8000/oauth/userinfo/
```

**Example Response**:

```json
{
  "sub": "1",
  "username": "xxx",
  "email": "xxx@example.com",
  "permissions": {
    "admin_user": false,
    "create_applications": true
  }
}
```

## Notes

- All user information scopes (`username`, `email`, `permissions`) are **read-only**
- Only `GET` method is supported on `/oauth/userinfo/`
- Response fields depend on granted scopes
