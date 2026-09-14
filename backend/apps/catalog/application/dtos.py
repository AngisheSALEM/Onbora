from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from shared.application.dtos import BaseDTO


@dataclass
class ServiceCatalogDTO(BaseDTO):
    id: int
    name: str
    category: str
    description: str
    benefits: str
    technical_requirements: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CreateServiceDTO(BaseDTO):
    name: str
    category: str
    description: str
    benefits: str = ""
    technical_requirements: Dict[str, Any] = field(default_factory=dict)


@dataclass
class UpdateServiceDTO(BaseDTO):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    benefits: Optional[str] = None
    technical_requirements: Optional[Dict[str, Any]] = None


@dataclass
class CatalogUploadResultDTO(BaseDTO):
    filename: str
    file_type: str
    services_found_count: int
    services: List[Dict[str, Any]]
