from twin.models import BusinessTwin
from twin.domain.exceptions import TwinNotFoundException
from twin.application.dtos import BusinessTwinDTO
from shared.application.use_case import BaseUseCase


class GetBusinessTwinUseCase(BaseUseCase[int, BusinessTwinDTO]):
    def execute(self, dossier_id: int) -> BusinessTwinDTO:
        try:
            twin = BusinessTwin.objects.get(prospect_dossier_id=dossier_id)
            return BusinessTwinDTO(
                id=twin.id,
                prospect_dossier_id=twin.prospect_dossier_id,
                current_state=twin.current_state or [],
                proposed_state=twin.proposed_state or [],
                recommended_services=twin.recommended_services or [],
                roadmap=twin.roadmap or []
            )
        except BusinessTwin.DoesNotExist:
            raise TwinNotFoundException(dossier_id)
