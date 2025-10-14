from rest_framework.permissions import IsAuthenticated
from .models import User
from .serializers import UserAuthSerializer, UserSettingsSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.viewsets import GenericViewSet, ModelViewSet

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

        if User.objects.filter(username=request.data.get('username')).exists():
            return Response({'error': 'Username already exists'}, status=400)
        
        if User.objects.filter(email=request.data.get('email')).exists():
            return Response({'error': 'Email already exists'}, status=400)
        
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
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    
class UserSettingsViewSet(GenericViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(
        detail=False,
        methods=['get'],
        url_path='info',
    )
    def get_info(self, request):
        serializer = UserSettingsSerializer(request.user)
        return Response(serializer.data)
    
    @action(
        detail=False,
        methods=['post'],
        url_path='change-password',
    )
    def change_password(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        if not request.user.check_password(old_password):
            return Response({'error': 'Old password is incorrect'}, status=400)
        
        request.user.set_password(new_password)
        request.user.save()
        return Response({'status': 'Password changed successfully'})
    
    @action(
        detail=False,
        methods=['post'],
        url_path='change-email',
    )
    def change_email(self, request):
        new_email = request.data.get('new_email')
        
        if User.objects.filter(email=new_email).exists():
            return Response({'error': 'Email already exists'}, status=400)
        
        request.user.email = new_email
        request.user.save()
        return Response({'status': 'Email changed successfully'})
