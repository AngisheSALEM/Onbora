from abc import ABC, abstractmethod
from typing import List, Optional
from shared.infrastructure.repositories import BaseRepository
from .entities import ServiceCatalogEntity


class ICatalogRepository(BaseRepository[ServiceCatalogEntity, int], ABC):
    @abstractmethod
    def get_by_name(self, name: str) -> Optional[ServiceCatalogEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_by_category(self, category: str) -> List[ServiceCatalogEntity]:
        raise NotImplementedError
