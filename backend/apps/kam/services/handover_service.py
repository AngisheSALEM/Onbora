from typing import Dict, Any, Optional
from kam.models import ProspectDossier


class TechnicalHandoverService:
    """
    Service de génération du Technical Handover Pack pour les ingénieurs réseau et le provisioning MSP.
    """

    @staticmethod
    def build_handover_pack(dossier: ProspectDossier) -> Dict[str, Any]:
        """
        Construit le cahier des charges technique standardisé pour déploiement immédiat.
        """
        report = dossier.visit_report
        raw_data = dossier.raw_conversation_data or {}
        
        # Récupération des informations de l'entreprise si associées
        enterprise_name = dossier.contact_name or "Entreprise B2B"
        plaque_name = "Zone non définie"
        sector = "Général"
        location = dossier.billing_address or "Site client"
        
        if report and hasattr(report, 'preparation') and report.preparation.enterprise:
            ent = report.preparation.enterprise
            enterprise_name = ent.name
            plaque_name = getattr(ent.plaque_rel, 'name', ent.plaque)
            sector = ent.sector or sector
            location = ent.location or location

        # Extraction des spécifications techniques à partir des données IA ou des données brutes
        tech_specs = raw_data.get('technical_handover_specs', {})
        if not tech_specs:
            tech_specs = {
                "client_name": enterprise_name,
                "sector": sector,
                "site_address": location,
                "contact_technique": dossier.contact_name or "Responsable Technique",
                "phone": dossier.phone or "Non renseigné",
                "recommended_package": "Pack Connectivité Pro (Fibre 100M + M365)",
                "bandwidth_committed": "100 Mbps symétrique garanti",
                "backup_solution": "Routeur 4G LTE automatique (Failover)",
                "sla_guarantee": "GTR 4h (Garantie de Temps de Rétablissement)",
                "rack_space_required": "2U dans baie 19 pouces",
                "public_ip_count": 1,
                "dns_migration_required": True,
                "m365_tenant_creation": True,
            }

        return {
            "dossier_id": dossier.id,
            "status": dossier.status,
            "source": dossier.source,
            "created_at": dossier.created_at.isoformat() if dossier.created_at else None,
            "client_identity": {
                "company_name": enterprise_name,
                "sector": sector,
                "plaque_territory": plaque_name,
                "site_address": location,
                "rccm": dossier.rccm,
                "contact_person": dossier.contact_name,
                "phone": dossier.phone,
            },
            "engineering_specs": tech_specs,
            "deployment_readiness": {
                "is_contract_signed": dossier.status in ['ACCEPTED', 'PROVISIONING', 'COMPLETED', 'TRAINING'],
                "is_rccm_verified": bool(dossier.rccm),
                "is_site_survey_needed": False,
                "estimated_time_to_deliver_days": 5, # Norme cible : 5 jours vs 16 semaines
            },
            "provisioning_actions": {
                "kaabu_sync_ready": True,
                "arrowsphere_webhook_ready": True,
            }
        }
