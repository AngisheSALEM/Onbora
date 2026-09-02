from typing import Dict, Any

from shared.infrastructure.ai_providers import get_ai_qualification_provider


class FollowUpEmailService:
    """
    Service de génération automatique de séquences de relance commerciale (Speed-to-lead).
    """

    def __init__(self, ai_provider=None):
        self.ai_provider = ai_provider or get_ai_qualification_provider()

    def generate_email_sequences(self, enterprise_name: str, contact_name: str, qualification_result) -> Dict[str, str]:
        """
        Génère les emails prêts à l'envoi pour J+1 et J+4.
        """
        if hasattr(qualification_result, 'email_follow_up_j1') and hasattr(qualification_result, 'email_follow_up_j4'):
            return {
                'email_j1': qualification_result.email_follow_up_j1,
                'email_j4': qualification_result.email_follow_up_j4,
            }
        
        # Fallback de secours
        j1 = f"Objet : Synthèse de notre échange - {enterprise_name}\n\nBonjour {contact_name},\n\nMerci pour notre échange. Nous restons à votre disposition pour concrétiser ce projet."
        j4 = f"Objet : Suivi de projet - {enterprise_name}\n\nBonjour {contact_name},\n\nAvez-vous pu examiner notre proposition d'accompagnement ?"
        return {
            'email_j1': j1,
            'email_j4': j4,
        }
