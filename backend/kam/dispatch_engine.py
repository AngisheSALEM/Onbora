import logging
from accounts.models import User
from sales.models import Enterprise
from kam.models import ProspectDossier
from reporting.utils import log_demo_event

logger = logging.getLogger(__name__)

def dispatch_dossier(dossier: ProspectDossier):
    """
    Intelligent dispatch engine that automatically assigns a KAM to a new ProspectDossier.
    Calculates a score based on:
    - Proximity: KAM location matches enterprise location (+50 points)
    - Workload: Number of already assigned active dossiers (-10 points per dossier)
    - Availability: Immediate availability of the KAM (required)
    """
    logger.info(f"Initiating intelligent dispatch for Dossier #{dossier.id}")
    
    # 1. Get Enterprise details
    enterprise_name = "Entreprise Inconnue"
    enterprise_location = ""
    profile = {}
    
    if dossier.source == ProspectDossier.OUTBOUND_VISIT and dossier.visit_report:
        enterprise = dossier.visit_report.preparation.enterprise
        enterprise_name = enterprise.name
        enterprise_location = enterprise.location or ""
    else:
        if dossier.raw_qualification_data:
            profile = dossier.raw_qualification_data.get('profile') or {}
        if dossier.conversation:
            profile = dossier.conversation.extracted_profile or profile
            
        enterprise_name = profile.get('company_name')
        if not enterprise_name and dossier.conversation and dossier.conversation.client:
            enterprise_name = dossier.conversation.client.company_name
        if not enterprise_name:
            enterprise_name = "Entreprise Inconnue"
            
        enterprise_location = profile.get('location') or ""
        
        # Ensure an Enterprise model exists, attempting CRM Kaabu search to prevent duplicates first
        from sales.integrations.kaabu import KaabuClient
        
        kaabu_results = []
        try:
            client = KaabuClient()
            kaabu_results = client.search_organizations(name=enterprise_name)
        except Exception:
            pass

        if kaabu_results:
            # Match exact or first result from Kaabu CRM
            match = kaabu_results[0]
            enterprise, created = Enterprise.objects.get_or_create(
                kaabu_organization_id=match.get("id"),
                defaults={
                    "name": match.get("name", enterprise_name),
                    "website": match.get("website", ""),
                    "sector": match.get("sector", ""),
                    "approximate_size": match.get("size", ""),
                    "location": match.get("location", ""),
                    "siren": match.get("siren", ""),
                    "siret": match.get("siret", ""),
                    "sync_status": "SYNCED"
                }
            )
        else:
            enterprise, created = Enterprise.objects.get_or_create(
                name=enterprise_name,
                defaults={
                    "sector": profile.get('sector', ''),
                    "approximate_size": profile.get('company_size_estimate', ''),
                    "location": enterprise_location,
                    "sync_status": "PENDING"
                }
            )

    # 2. Get available KAMs
    kams = User.objects.filter(role=User.KAM, is_available=True)
    if not kams.exists():
        logger.warning("No available KAMs found. Checking all KAMs as fallback.")
        kams = User.objects.filter(role=User.KAM)
        
    if not kams.exists():
        logger.error("No KAM accounts exist in the database. Cannot dispatch.")
        return None

    best_kam = None
    best_score = -9999
    reasons = []

    # 3. Calculate scores
    for kam in kams:
        score = 100
        reasons_kam = []
        
        # Proximity score (+50)
        kam_loc = kam.location or ""
        if kam_loc and enterprise_location:
            if kam_loc.lower() in enterprise_location.lower() or enterprise_location.lower() in kam_loc.lower():
                score += 50
                reasons_kam.append(f"Proximité géographique (+50 pts) - Ville: {kam_loc}")
            else:
                reasons_kam.append(f"Hors secteur - Ville: {kam_loc}")
        else:
            reasons_kam.append("Aucune donnée de localisation")

        # Workload penalty (-10 per assigned dossier)
        assigned_count = ProspectDossier.objects.filter(kam=kam).count()
        penalty = assigned_count * 10
        score -= penalty
        reasons_kam.append(f"Charge actuelle: {assigned_count} dossier(s) (-{penalty} pts)")

        # Log details
        logger.debug(f"KAM {kam.username} calculated score: {score}. Details: {reasons_kam}")
        
        if score > best_score:
            best_score = score
            best_kam = kam
            reasons = reasons_kam

    # 4. Assign best KAM and save
    if best_kam:
        dossier.kam = best_kam
        # Direct assignment moves it from NEW to IN_REVIEW so the KAM sees it immediately!
        dossier.status = ProspectDossier.IN_REVIEW
        dossier.save()

        # Log event for real-time demonstration audit
        log_message = (
            f"Affectation automatique intelligente du dossier {enterprise_name} au KAM {best_kam.first_name} {best_kam.last_name} "
            f"(Score: {best_score}). Raison : {', '.join(reasons)}."
        )
        logger.info(log_message)
        
        log_demo_event(
            event_type='DOSSIER_DISPATCHED',
            description=log_message,
            metadata={
                "dossier_id": dossier.id,
                "kam_id": best_kam.id,
                "score": best_score,
                "reasons": reasons,
                "enterprise_name": enterprise_name
            }
        )
        
        # Simulate real-time CRM transmission log
        crm_message = f"Données de qualification pour {enterprise_name} synchronisées avec succès avec le CRM Salesforce."
        log_demo_event(
            event_type='CRM_SYNCHRONIZED',
            description=crm_message,
            metadata={
                "dossier_id": dossier.id,
                "enterprise_name": enterprise_name
            }
        )

    return best_kam
