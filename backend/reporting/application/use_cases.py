from typing import List, Dict, Any, Optional
from reporting.models import DemoEvent
from kam.models import ProspectDossier
from reporting.application.dtos import DemoEventDTO, DemoStatsDTO
from shared.application.use_case import BaseUseCase


class LogDemoEventUseCase(BaseUseCase[tuple[str, str, Optional[Any], Optional[Dict[str, Any]]], Optional[DemoEvent]]):
    def execute(self, params: tuple[str, str, Optional[Any], Optional[Dict[str, Any]]]) -> Optional[DemoEvent]:
        event_type, description, user, metadata = params
        if metadata is None:
            metadata = {}
        try:
            return DemoEvent.objects.create(
                event_type=event_type,
                description=description,
                user=user,
                metadata=metadata
            )
        except Exception as e:
            print(f"Error logging demo event: {e}")
            return None


class GetDemoStatsUseCase(BaseUseCase[None, DemoStatsDTO]):
    def execute(self, request: None = None) -> DemoStatsDTO:
        total_dossiers = ProspectDossier.objects.count()
        inbound_count = ProspectDossier.objects.filter(source=ProspectDossier.INBOUND_CONVERSATION).count()
        outbound_count = ProspectDossier.objects.filter(source=ProspectDossier.OUTBOUND_VISIT).count()

        accepted_count = ProspectDossier.objects.filter(status=ProspectDossier.ACCEPTED).count()
        review_count = ProspectDossier.objects.filter(status=ProspectDossier.IN_REVIEW).count()
        new_count = ProspectDossier.objects.filter(status=ProspectDossier.NEW).count()

        conversion_rate = 0.0
        if total_dossiers > 0:
            conversion_rate = round((accepted_count / total_dossiers) * 100, 1)

        recent_logs = []
        for log in DemoEvent.objects.all()[:20]:
            recent_logs.append({
                "id": log.id,
                "event_type": log.event_type,
                "event_type_display": log.get_event_type_display(),
                "description": log.description,
                "user": f"{log.user.first_name} {log.user.last_name}" if log.user else "Visiteur",
                "created_at": log.created_at.strftime('%d/%m/%Y %H:%M:%S'),
                "metadata": log.metadata
            })

        return DemoStatsDTO(
            total_dossiers=total_dossiers,
            inbound_count=inbound_count,
            outbound_count=outbound_count,
            status_counts={
                "NEW": new_count,
                "IN_REVIEW": review_count,
                "ACCEPTED": accepted_count
            },
            conversion_rate=conversion_rate,
            recent_logs=recent_logs
        )


class GetDemoLogsUseCase(BaseUseCase[None, List[Dict[str, Any]]]):
    def execute(self, request: None = None) -> List[Dict[str, Any]]:
        logs = []
        for log in DemoEvent.objects.all():
            logs.append({
                "id": log.id,
                "event_type": log.event_type,
                "event_type_display": log.get_event_type_display(),
                "description": log.description,
                "user": f"{log.user.first_name} {log.user.last_name}" if log.user else "Visiteur",
                "created_at": log.created_at.strftime('%d/%m/%Y %H:%M:%S'),
                "metadata": log.metadata
            })
        return logs
