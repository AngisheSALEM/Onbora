from abc import ABC, abstractmethod
from typing import List, Optional
from shared.infrastructure.repositories import BaseRepository
from .entities import EnterpriseEntity, VisitPreparationEntity, VisitReportEntity, ScraperCredentialEntity


class IEnterpriseRepository(BaseRepository[EnterpriseEntity, int], ABC):
    @abstractmethod
    def search_by_name_or_kaabu(self, query: str, matched_ids: List[str]) -> List[EnterpriseEntity]:
        raise NotImplementedError


class IVisitPreparationRepository(BaseRepository[VisitPreparationEntity, int], ABC):
    @abstractmethod
    def get_by_enterprise(self, enterprise_id: int) -> List[VisitPreparationEntity]:
        raise NotImplementedError


class IVisitReportRepository(BaseRepository[VisitReportEntity, int], ABC):
    @abstractmethod
    def get_by_preparation(self, preparation_id: int) -> Optional[VisitReportEntity]:
        raise NotImplementedError
