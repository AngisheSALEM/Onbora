from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional
from shared.application.dtos import BaseDTO


@dataclass
class DemoEventDTO(BaseDTO):
    id: int
    event_type: str
    event_type_display: str
    description: str
    user: str
    created_at: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DemoStatsDTO(BaseDTO):
    total_dossiers: int
    inbound_count: int
    outbound_count: int
    status_counts: Dict[str, int]
    conversion_rate: float
    recent_logs: List[Dict[str, Any]]
    funnel_stages: List[Dict[str, Any]] = field(default_factory=list)
    drop_off_metrics: Dict[str, Any] = field(default_factory=dict)
    unconverted_clients: List[Dict[str, Any]] = field(default_factory=list)
    activity_timeline: List[Dict[str, Any]] = field(default_factory=list)
    zone_distribution: List[Dict[str, Any]] = field(default_factory=list)
    sector_distribution: List[Dict[str, Any]] = field(default_factory=list)
    kpis: Dict[str, Any] = field(default_factory=dict)

