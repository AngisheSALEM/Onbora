from typing import Any, List, Optional
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from accounts.models import User
from accounts.application.dtos import RegisterRequestDTO, LoginRequestDTO, AuthResponseDTO, UserDTO
from accounts.domain.exceptions import InvalidCredentialsException, UserAlreadyExistsException
from shared.application.use_case import BaseUseCase


class RegisterUserUseCase(BaseUseCase[RegisterRequestDTO, AuthResponseDTO]):
    def execute(self, request: RegisterRequestDTO) -> AuthResponseDTO:
        if User.objects.filter(username=request.username).exists():
            raise UserAlreadyExistsException(request.username)

        user = User.objects.create_user(
            username=request.username,
            email=request.email,
            password=request.password,
            role=request.role,
            phone=request.phone or '',
            company_name=request.company_name or '',
            first_name=request.first_name or '',
            last_name=request.last_name or '',
        )
        token, _ = Token.objects.get_or_create(user=user)

        user_dto = UserDTO(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            phone=user.phone,
            company_name=user.company_name,
            first_name=user.first_name,
            last_name=user.last_name,
            location=user.location,
            is_available=user.is_available,
        )
        return AuthResponseDTO(token=token.key, user=user_dto)


class LoginUserUseCase(BaseUseCase[LoginRequestDTO, AuthResponseDTO]):
    def execute(self, request: LoginRequestDTO) -> AuthResponseDTO:
        login_input = request.username_or_email.strip()
        user_obj = None
        if '@' in login_input:
            user_obj = User.objects.filter(email__iexact=login_input).first()
        if not user_obj:
            user_obj = User.objects.filter(username__iexact=login_input).first()

        username_to_auth = user_obj.username if user_obj else login_input
        user = authenticate(username=username_to_auth, password=request.password)

        if not user:
            raise InvalidCredentialsException()

        token, _ = Token.objects.get_or_create(user=user)
        user_dto = UserDTO(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            phone=user.phone,
            company_name=user.company_name,
            first_name=user.first_name,
            last_name=user.last_name,
            location=user.location,
            is_available=user.is_available,
        )
        return AuthResponseDTO(token=token.key, user=user_dto)


class GetMeUseCase(BaseUseCase[User, UserDTO]):
    def execute(self, user: User) -> UserDTO:
        return UserDTO(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            phone=user.phone,
            company_name=user.company_name,
            first_name=user.first_name,
            last_name=user.last_name,
            location=user.location,
            is_available=user.is_available,
        )


class ListKAMsUseCase(BaseUseCase[Any, List[UserDTO]]):
    def execute(self, request: Any = None) -> List[UserDTO]:
        kams = User.objects.filter(role=User.KAM)
        return [
            UserDTO(
                id=kam.id,
                username=kam.username,
                email=kam.email,
                role=kam.role,
                phone=kam.phone,
                company_name=kam.company_name,
                first_name=kam.first_name,
                last_name=kam.last_name,
                location=kam.location,
                is_available=kam.is_available,
            )
            for kam in kams
        ]
