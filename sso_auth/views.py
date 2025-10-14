from rest_framework.permissions import IsAuthenticated
from .models import User
from .serializers import UserAuthSerializer, UserSettingsSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.viewsets import GenericViewSet, ModelViewSet
from rest_framework_simplejwt.authentication import JWTAuthentication

# Create your views here.
class UserAuthViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ['username', 'email']

    def get_queryset(self):
        return User.objects.order_by('id')
    
    @action(
        detail=False,
        methods=['post'],
        url_path='login',
        permission_classes=[],
    )
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        try:
            user = User.objects.get(username=username)
            if user.check_password(password) and user.is_active:
                refresh = RefreshToken.for_user(user)
                refresh['ver'] = user.token_version
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                })
            else:
                return Response({'error': 'Invalid username or password'}, status=400)

        except User.DoesNotExist:
            return Response({'error': 'Invalid username or password'}, status=400)
        
    @action(
        detail=False,
        methods=['post'],
        url_path='register',
        permission_classes=[],
    )
    def register(self, request):
        serializer = UserAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from .models import Permission
        user_permission = Permission.objects.create()

        user = User.objects.create_user(
            username=request.data.get('username'),
            email=request.data.get('email'),
            permission=user_permission,
            password=request.data.get('password'),
        )
        user.save()

        refresh = RefreshToken.for_user(user)
        refresh['ver'] = user.token_version
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    
    @action(
        detail=False,
        methods=['post'],
        url_path='logout',
    )
    def logout(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            user = request.user
            user.token_version += 1  # Increment token version to invalidate existing tokens
            user.save()
            return Response({'status': 'Logged out successfully'})
        except Exception as e:
            return Response({'error': 'Invalid token'}, status=400)
    
class CustomJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if validated_token['ver'] != user.token_version:
            return Response({'error': 'Token version mismatch'}, status=400)
        return user

class UserSettingsViewSet(GenericViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(
        detail=False,
        methods=['get'],
        url_path='info',
    )
    def get_info(self, request):
        user = CustomJWTAuthentication().get_user(request.auth)
        try:
            serializer = UserSettingsSerializer(user)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': 'Invalid Token'}, status=400)

    @action(
        detail=False,
        methods=['post'],
        url_path='change-password',
    )
    def change_password(self, request):
        user = CustomJWTAuthentication().get_user(request.auth)
        try:
            serialzer = UserSettingsSerializer(user)
            old_password = request.data.get('old_password')
            new_password = request.data.get('new_password')
            
            if not user.check_password(old_password):
                return Response({'error': 'Old password is incorrect'}, status=400)
            
            user.set_password(new_password)
            user.save()
            return Response({'status': 'Password changed successfully'})
        except Exception as e:
            return Response({'error': 'Invalid Token'}, status=400)
    
    @action(
        detail=False,
        methods=['post'],
        url_path='change-email',
    )
    def change_email(self, request):
        user = CustomJWTAuthentication().get_user(request.auth)
        try:
            serialzer = UserSettingsSerializer(user)
            new_email = request.data.get('new_email')
        
            if User.objects.filter(email=new_email).exists():
                return Response({'error': 'Email already exists'}, status=400)
            
            user.email = new_email
            user.save()
            return Response({'status': 'Email changed successfully'})
        except Exception as e:
            return Response({'error': 'Invalid Token'}, status=400)
