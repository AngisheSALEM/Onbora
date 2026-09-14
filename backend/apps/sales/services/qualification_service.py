import logging
from typing import Dict, Any, Optional

from shared.infrastructure.ai_providers import get_ai_qualification_provider
from shared.domain.ai_qualification import BANTScore, AIQualificationResult

logger = logging.getLogger(__name__)


class BANTQualificationService:
    """
    Service de qualification et disqualification précoce BANT pour le commercial.
    """

    def __init__(self, ai_provider=None):
        self.ai_provider = ai_provider or get_ai_qualification_provider()

    def evaluate_enterprise_brief(self, enterprise) -> Dict[str, Any]:
        """
        Évalue le profil d'une entreprise avant la visite terrain pour afficher les alertes.
        """
        data = {
            'name': getattr(enterprise, 'name', ''),
            'sector': getattr(enterprise, 'sector', ''),
            'approximate_size': getattr(enterprise, 'approximate_size', ''),
            'location': getattr(enterprise, 'location', ''),
        }
        bant_score = self.ai_provider.qualify_lead_brief(data)
        
        return {
            'budget_score': bant_score.budget_score,
            'authority_score': bant_score.authority_score,
            'need_score': bant_score.need_score,
            'timeline_score': bant_score.timeline_score,
            'total_score': bant_score.total_score,
            'status': bant_score.status,
            'disqualification_reason': bant_score.disqualification_reason,
            'is_disqualified': bant_score.status == 'DISQUALIFIED',
            'action_recommendation': (
                "Prospect non qualifié : Ne pas faire de déplacement ni de devis coûteux."
                if bant_score.status == 'DISQUALIFIED'
                else "Prospect à haute priorité : Préparer le pitch de rentabilité."
                if bant_score.status == 'HOT_LEAD'
                else "Prospect standard : Valider les décideurs et le budget lors du RDV."
            )
        }

    def process_visit_transcription(self, raw_transcript: str, enterprise_data: Dict[str, Any]) -> AIQualificationResult:
        """
        Traite la transcription Whisper post-visite et retourne l'ensemble des livrables (BANT, COI, Packages, Handover).
        """
        return self.ai_provider.qualify_visit(raw_transcript, enterprise_data)
