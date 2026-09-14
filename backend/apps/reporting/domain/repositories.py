from abc import ABC, abstractmethod
from typing import List, Optional
from shared.infrastructure.repositories import BaseRepository
from .entities import DemoEventEntity


class IReportingRepository(BaseRepository[DemoEventEntity, int], ABC):
    @abstractmethod
    def list_recent(self, limit: int = 20) -> List[DemoEventEntity]:
        raise NotImplementedError
