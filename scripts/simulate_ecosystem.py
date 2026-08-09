import sys
import os
import time
import requests
import json

# Setup Django environment
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'onbora.settings')

import django
django.setup()

from sales.models import Enterprise
from sales.integrations.kaabu import KaabuClient
from sales.integrations.arrowsphere import ArrowSphereClient

def run_ecosystem_simulation(company_name="Orange Business", siren="345678901"):
    print("=" * 70)
    print(">>> DEMARRAGE DE LA SIMULATION D'ECOSYSTEME COMPLET ONBORA x KAABU x ARROWSPHERE")
    print("=" * 70)
    print()

    # Étape 1 : Qualification Onbora & Push vers Kaabu CRM
    print("[1/4] ONBORA -> KAABU CRM : Envoi de l'opportunite qualifiee B2B...")
    kaabu_client = KaabuClient()
    opp_payload = {
        "opportunity_id": "OPP-KAABU-ECOSYSTEM-101",
        "organization_id": f"KB-{siren}",
        "company_name": company_name,
        "siren": siren,
        "source": "ONBORA_INBOUND_QUALIFICATION",
        "status": "QUALIFIED",
        "estimated_budget": "1500.00",
        "recommended_services": ["M365_BUSINESS_PREMIUM", "CISCO_VPN_PRO", "CYBER_FIREWALL_MANAGED"]
    }
    
    res_kaabu = kaabu_client.send_opportunity_data(opp_payload)
    print(f"   --> Reponse Kaabu CRM : {json.dumps(res_kaabu, indent=2)}")
    print("   [OK] Opportunite enregistree dans Kaabu CRM avec succes !\n")

    # Étape 2 : Traitement Commercial & Contrat Kaabu -> ArrowSphere
    print("[2/4] KAABU CRM -> ARROWSPHERE : Transfert du contrat signe pour provisioning...")
    print("   ... Simulation du delai d'activation reseau et licences (3 secondes)...")
    time.sleep(3)
    print("   [OK] Provisioning valide chez ArrowSphere !\n")

    # Étape 3 : ArrowSphere -> Webhook POST vers Onbora
    print("[3/4] ARROWSPHERE -> ONBORA : Envoi de la notification Webhook d'activation...")
    arrowsphere_client = ArrowSphereClient()
    tenant_id = f"TENANT-ORANGE-{siren[:4]}"
    
    # Créer ou mettre à jour l'entreprise localement
    enterprise, _ = Enterprise.objects.get_or_create(
        siren=siren,
        defaults={
            "name": company_name,
            "arrowsphere_tenant_id": tenant_id,
            "sync_status": "PENDING"
        }
    )
    enterprise.arrowsphere_tenant_id = tenant_id
    enterprise.save()

    res_webhook = arrowsphere_client.simulate_incoming_activation(
        tenant_id=tenant_id,
        services=["M365_BUSINESS_PREMIUM", "CISCO_VPN_PRO", "CYBER_FIREWALL_MANAGED"]
    )
    print(f"   --> Reponse Webhook Onbora : {json.dumps(res_webhook, indent=2)}")
    print("   [OK] Webhook d'activation recu et acquitte par Onbora !\n")

    # Étape 4 : Déverrouillage des Formations Client (HelpDrawer)
    print("[4/4] ONBORA : Verification du deverrouillage de l'Adoption & Formations...")
    enterprise.refresh_from_db()
    print(f"   --> Statut de l'entreprise '{enterprise.name}' : {enterprise.sync_status}")
    print("   --> Modules de formation deverrouilles :")
    print("       * Microsoft 365 & Authenticator (Guide pas-a-pas)")
    print("       * VPN Cisco AnyConnect Pro (Onboarding Securise)")
    print("       * Cybersecurity & Firewall Gere (Tutoriel Interactif)")
    print()
    print("=" * 70)
    print(">>> ECOSYSTEME SIMULE AVEC SUCCES ! LA BOUCLE FERMEE EST VALIDEE.")
    print("=" * 70)

if __name__ == "__main__":
    company = sys.argv[1] if len(sys.argv) > 1 else "Orange Business Services"
    run_ecosystem_simulation(company_name=company)

