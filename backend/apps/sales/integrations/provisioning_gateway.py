import time
import logging
from typing import Dict, Any, List, Optional
from django.utils import timezone

logger = logging.getLogger(__name__)

class ProvisioningGateway:
    """
    Passerelle Orchestrée STP (Straight-Through Processing) d'Onbora.
    Connectée aux 3 systèmes BSS/OSS centraux d'Orange :
    1. ZTE ZSmart : Activation SIM/eSIM 5G, forfaits data flotte B2B et attribution MSISDN.
    2. Microsoft Partner Center CSP : Création du Tenant M365 et attribution des licences Business.
    3. TOM Fibre Core : Déclaration OLT, assignation VLAN et allocation de la plage d'IP fixes.
    """

    @classmethod
    def trigger_zte_mobile_provisioning(cls, company_name: str, lines_count: int = 5) -> Dict[str, Any]:
        """Simulation / Appel API ZTE ZSmart BSS"""
        logger.info(f"[ZTE ZSmart] Déclenchement activation de {lines_count} lignes B2B pour {company_name}")
        # Simulation d'allocation d'identifiants
        allocated_lines = []
        for i in range(1, lines_count + 1):
            msisdn = f"+243 84 {1000000 + (hash(company_name + str(i)) % 8999999)}"
            iccid = f"8924302{10000000000 + (hash(company_name + str(i)) % 89999999999)}"
            allocated_lines.append({
                "line_index": i,
                "msisdn": msisdn,
                "iccid": iccid,
                "profile": "Orange Pro 5G Illimité + Roaming",
                "status": "ACTIVE"
            })

        return {
            "system": "ZTE ZSmart BSS/OSS",
            "status": "SUCCESS",
            "order_reference": f"ZTE-B2B-{int(time.time())}",
            "allocated_lines": allocated_lines,
            "timestamp": timezone.now().isoformat()
        }

    @classmethod
    def trigger_microsoft_csp_provisioning(cls, company_name: str, admin_email: str, seats_count: int = 5) -> Dict[str, Any]:
        """Simulation / Appel API Microsoft Partner Center CSP"""
        clean_domain = company_name.lower().replace(" ", "").replace("-", "")[:12]
        tenant_domain = f"{clean_domain}.onmicrosoft.com"
        logger.info(f"[Microsoft CSP] Création Tenant {tenant_domain} ({seats_count} licences M365 Business Standard)")

        return {
            "system": "Microsoft Partner Center CSP Direct",
            "status": "SUCCESS",
            "tenant_id": f"TENANT-{int(time.time())}-{clean_domain.upper()}",
            "tenant_domain": tenant_domain,
            "admin_user": f"admin@{tenant_domain}",
            "provisional_password": f"Orange!{int(time.time()) % 10000}",
            "licenses_assigned": {
                "sku": "M365_BUSINESS_STANDARD",
                "seats": seats_count,
                "status": "ACTIVE"
            },
            "timestamp": timezone.now().isoformat()
        }

    @classmethod
    def trigger_tom_fibre_provisioning(cls, company_name: str, location: str, bandwidth_mbps: int = 100) -> Dict[str, Any]:
        """Simulation / Appel API TOM Telecom Order Management Fibre"""
        logger.info(f"[TOM Fibre] Raccordement FTTO/FTTH {bandwidth_mbps} Mbps à {location} pour {company_name}")
        vlan_id = 1000 + (hash(company_name) % 3000)
        fixed_ip = f"41.243.{10 + (hash(company_name) % 200)}.{2 + (hash(location) % 250)}"

        return {
            "system": "TOM Fibre Telecom Order Management",
            "status": "SUCCESS",
            "circuit_id": f"FTTO-KIN-{vlan_id}",
            "vlan_id": vlan_id,
            "allocated_fixed_ip": fixed_ip,
            "bandwidth": f"{bandwidth_mbps} Mbps GTR 4h",
            "olt_status": "PROVISIONED_READY",
            "timestamp": timezone.now().isoformat()
        }

    @classmethod
    def orchestrate_stp_workflow(cls, dossier_id: int, company_name: str, admin_email: str, location: str) -> Dict[str, Any]:
        """
        Orchestration de bout en bout en 1-clic (Straight-Through Processing).
        Combine ZTE + Microsoft CSP + TOM Fibre et retourne la synthèse d'activation.
        """
        zte_res = cls.trigger_zte_mobile_provisioning(company_name, lines_count=5)
        m365_res = cls.trigger_microsoft_csp_provisioning(company_name, admin_email, seats_count=5)
        tom_res = cls.trigger_tom_fibre_provisioning(company_name, location, bandwidth_mbps=100)

        return {
            "dossier_id": dossier_id,
            "company_name": company_name,
            "orchestration_status": "ALL_SERVICES_ACTIVE",
            "execution_mode": "STRAIGHT_THROUGH_PROCESSING_1CLICK",
            "zte_zsmart": zte_res,
            "microsoft_csp": m365_res,
            "tom_fibre": tom_res,
            "sms_notification_sent": True,
            "email_notification_sent": True,
            "activated_at": timezone.now().isoformat()
        }
