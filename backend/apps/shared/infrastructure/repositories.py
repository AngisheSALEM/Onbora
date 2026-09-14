from abc import ABC, abstractmethod
from typing import Any, Generic, List, Optional, TypeVar
from shared.domain.entities import Entity

TEntity = TypeVar('TEntity', bound=Entity)
TID = TypeVar('TID')


class BaseRepository(ABC, Generic[TEntity, TID]):
    """Generic repository abstraction for aggregate roots."""
    @abstractmethod
    def get_by_id(self, entity_id: TID) -> Optional[TEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_all(self) -> List[TEntity]:
        raise NotImplementedError

    @abstractmethod
    def save(self, entity: TEntity) -> TEntity:
        raise NotImplementedError

    @abstractmethod
    def delete(self, entity_id: TID) -> bool:
        raise NotImplementedError
