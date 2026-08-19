from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from shared.domain.entities import AggregateRoot
from .value_objects import ServiceCategory


@dataclass
class ServiceCatalogEntity(AggregateRoot):
    name: str = ""
    category: str = ServiceCategory.CONNECTIVITY.value
    description: str = ""
    benefits: str = ""
    technical_requirements: Dict[str, Any] = field(default_factory=dict)
