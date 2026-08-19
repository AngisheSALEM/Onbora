from abc import ABC, abstractmethod
from typing import List, Optional
from shared.infrastructure.repositories import BaseRepository
from .entities import UserEntity


class IUserRepository(BaseRepository[UserEntity, int], ABC):
    """Abstract Repository interface for User aggregate."""
    @abstractmethod
    def get_by_username(self, username: str) -> Optional[UserEntity]:
        raise NotImplementedError

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[UserEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_by_role(self, role: str) -> List[UserEntity]:
        raise NotImplementedError
