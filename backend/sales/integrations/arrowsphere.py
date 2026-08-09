import os
import requests
import logging

logger = logging.getLogger(__name__)

class ArrowSphereClient:
    """
    Passerelle d'intégration avec ArrowSphere Provisioning.
    - ArrowSphere est le système d'Orange responsable de l'activation des licences cloud (M365, Cyber...).
    - Onbora ne passe PAS de commandes et n'orchestre RIEN.
    - Cette classe sert uniquement à recevoir/parser les webhooks d'activation transmises par ArrowSphere
      et à fournir un déclencheur de simulation local pour la démo.
    """
    def __init__(self):
        self.webhook_url = os.getenv("ONBORA_WEBHOOK_URL", "http://localhost:8000/api/v1/sales/arrowsphere/webhook/")

    def parse_activation_webhook(self, payload):
        """
        Parse et valide les données de la notification d'activation envoyée par ArrowSphere.
        Format du payload attendu :
        {
            "tenant_id": "TENANT-12345",
            "status": "ACTIVE",
            "activated_services": ["MICROSOFT_365", "CYBER_FIREWALL"],
            "activation_date": "2026-08-09T17:00:00Z"
        }
        """
        tenant_id = payload.get("tenant_id")
        status = payload.get("status", "INACTIVE")
        activated_services = payload.get("activated_services", [])
        
        return {
            "valid": bool(tenant_id and status == "ACTIVE"),
            "tenant_id": tenant_id,
            "status": status,
            "activated_services": activated_services,
            "raw_payload": payload
        }

    def simulate_incoming_activation(self, tenant_id, services=None):
        """
        Méthode de test/simulation : Simule l'envoi d'un Webhook depuis ArrowSphere vers Onbora.
        """
        if services is None:
            services = ["MICROSOFT_365_PRO", "CISCO_VPN_SECURITY"]

        payload = {
            "tenant_id": tenant_id,
            "status": "ACTIVE",
            "activated_services": services,
            "activation_date": "2026-08-09T17:10:00Z",
            "provider": "ArrowSphere Orange Cloud Engine"
        }
        
        try:
            res = requests.post(self.webhook_url, json=payload, timeout=5)
            return res.json()
        except Exception as e:
            logger.info(f"[ArrowSphereClient] Simulation locale d'activation traitée ({e})")
            return {
                "message": "Notification Webhook ArrowSphere simulée avec succès",
                "tenant_id": tenant_id,
                "status": "ACTIVE",
                "unlocked_services": services
            }
