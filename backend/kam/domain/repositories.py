from abc import ABC, abstractmethod
from typing import List, Optional
from shared.infrastructure.repositories import BaseRepository
from .entities import ProspectDossierEntity


class IDossierRepository(BaseRepository[ProspectDossierEntity, int], ABC):
    @abstractmethod
    def list_by_kam(self, kam_id: int) -> List[ProspectDossierEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_by_status(self, status: str) -> List[ProspectDossierEntity]:
        raise NotImplementedError
