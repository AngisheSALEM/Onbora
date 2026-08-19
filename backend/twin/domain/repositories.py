from abc import ABC, abstractmethod
from typing import Optional
from shared.infrastructure.repositories import BaseRepository
from .entities import BusinessTwinEntity


class IBusinessTwinRepository(BaseRepository[BusinessTwinEntity, int], ABC):
    @abstractmethod
    def get_by_dossier_id(self, dossier_id: int) -> Optional[BusinessTwinEntity]:
        raise NotImplementedError
