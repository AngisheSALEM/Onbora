from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'phone', 'company_name', 'first_name', 'last_name']
        read_only_fields = ['id']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'phone', 'company_name', 'first_name', 'last_name']
        
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            role=validated_data.get('role', User.CLIENT_B2B),
            phone=validated_data.get('phone', ''),
            company_name=validated_data.get('company_name', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        login_input = data.get('username', '').strip()
        password = data.get('password')
        
        if login_input and password:
            user_obj = None
            if '@' in login_input:
                user_obj = User.objects.filter(email__iexact=login_input).first()
            if not user_obj:
                user_obj = User.objects.filter(username__iexact=login_input).first()
                
            username_to_auth = user_obj.username if user_obj else login_input
            user = authenticate(username=username_to_auth, password=password)
            
            if not user:
                raise serializers.ValidationError("Identifiants incorrects. Vérifiez votre identifiant/email et mot de passe.")
        else:
            raise serializers.ValidationError("Le nom d'utilisateur ou l'email ainsi que le mot de passe sont requis.")
            
        data['user'] = user
        return data
