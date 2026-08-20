from abc import ABC, abstractmethod
from typing import List, Optional
from shared.infrastructure.repositories import BaseRepository
from .entities import (
    PlaqueEntity,
    EnterpriseEntity,
    VisitPreparationEntity,
    VisitReportEntity,
    LiveVisitSessionEntity,
    ScraperCredentialEntity,
)


class IPlaqueRepository(BaseRepository[PlaqueEntity, int], ABC):
    @abstractmethod
    def get_by_code(self, code: str) -> Optional[PlaqueEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_active_plaques(self) -> List[PlaqueEntity]:
        raise NotImplementedError


class IEnterpriseRepository(BaseRepository[EnterpriseEntity, int], ABC):
    @abstractmethod
    def search_by_name_or_kaabu(self, query: str, matched_ids: List[str]) -> List[EnterpriseEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_by_plaque(self, plaque: Optional[str] = None, ready_only: bool = False) -> List[EnterpriseEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_by_plaque_id(self, plaque_id: int) -> List[EnterpriseEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_distinct_plaques(self) -> List[str]:
        raise NotImplementedError


class IVisitPreparationRepository(BaseRepository[VisitPreparationEntity, int], ABC):
    @abstractmethod
    def get_by_enterprise(self, enterprise_id: int) -> List[VisitPreparationEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_by_salesperson(self, salesperson_id: int) -> List[VisitPreparationEntity]:
        raise NotImplementedError


class ILiveVisitSessionRepository(BaseRepository[LiveVisitSessionEntity, int], ABC):
    @abstractmethod
    def get_active_session(self, salesperson_id: int, enterprise_id: int) -> Optional[LiveVisitSessionEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_by_salesperson(self, salesperson_id: int) -> List[LiveVisitSessionEntity]:
        raise NotImplementedError


class IVisitReportRepository(BaseRepository[VisitReportEntity, int], ABC):
    @abstractmethod
    def get_by_preparation(self, preparation_id: int) -> Optional[VisitReportEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_by_salesperson(self, salesperson_id: int) -> List[VisitReportEntity]:
        raise NotImplementedError

