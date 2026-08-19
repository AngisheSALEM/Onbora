from dataclasses import dataclass
from typing import Optional
from shared.domain.entities import AggregateRoot
from .value_objects import UserRole


@dataclass
class UserEntity(AggregateRoot):
    username: str = ""
    email: str = ""
    role: str = UserRole.CLIENT_B2B.value
    phone: Optional[str] = None
    company_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    location: Optional[str] = None
    is_available: bool = True
    is_active: bool = True
