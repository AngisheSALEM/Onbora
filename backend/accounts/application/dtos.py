from dataclasses import dataclass
from typing import Optional
from shared.application.dtos import BaseDTO


@dataclass
class UserDTO(BaseDTO):
    id: int
    username: str
    email: str
    role: str
    phone: Optional[str] = None
    company_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    location: Optional[str] = None
    is_available: bool = True


@dataclass
class RegisterRequestDTO(BaseDTO):
    username: str
    password: str
    email: str = ""
    role: str = "CLIENT_B2B"
    phone: Optional[str] = None
    company_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


@dataclass
class LoginRequestDTO(BaseDTO):
    username_or_email: str
    password: str


@dataclass
class AuthResponseDTO(BaseDTO):
    token: str
    user: UserDTO
