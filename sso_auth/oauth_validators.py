from oauth2_provider.oauth2_validators import OAuth2Validator


class CustomOAuth2Validator(OAuth2Validator):
    """
    Custom OAuth2 validator to handle custom scopes for username, email, and permissions.
    
    All custom scopes provide READ-ONLY access:
    - username: Read-only access to username
    - email: Read-only access to email address
    - permissions: Read-only access to user permissions
    """

    def get_additional_claims(self, request):
        """
        Add additional claims to the token based on the requested scopes.
        This is used for ID tokens in OIDC flow.
        
        All claims are read-only and cannot be used to modify user information.
        """
        claims = {}
        
        if request.user:
            scopes = request.scopes
            
            # Add username if 'username' scope is requested
            if 'username' in scopes:
                claims['username'] = request.user.username
            
            # Add email if 'email' scope is requested
            if 'email' in scopes:
                claims['email'] = request.user.email
            
            # Add permissions if 'permissions' scope is requested (read-only)
            if 'permissions' in scopes:
                permission = getattr(request.user, 'permission', None)
                if permission:
                    claims['permissions'] = {
                        'admin_user': permission.admin_user,
                        'create_applications': permission.create_applications,
                    }
                else:
                    claims['permissions'] = {
                        'admin_user': False,
                        'create_applications': False,
                    }
        
        return claims

    def validate_scopes(self, client_id, scopes, client, request, *args, **kwargs):
        """
        Validate that the requested scopes are allowed.
        Allow our custom scopes: username, email, permissions
        """
        allowed_scopes = ['username', 'email', 'permissions']
        return all(scope in allowed_scopes for scope in scopes)
