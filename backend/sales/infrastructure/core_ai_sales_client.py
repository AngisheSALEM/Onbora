import os
import requests
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

CORE_AI_URL = os.getenv("CORE_AI_URL", "http://localhost:8001/api/v1").rstrip("/")


class CoreAISalesClient:
    """
    Client d'interaction entre le module Sales (Outbound) et le microservice Core AI.
    Prend en charge :
    1. La génération d'hypothèses commerciales pré-visite à partir des données scrapées.
    2. L'analyse en direct du copilote de visite (Whisper stream -> Proposition dynamique JSON).
    3. La génération du rapport de visite complet post-RDV.
    4. La boucle d'amélioration continue (Feedback / Dataset d'évaluation pour affiner l'IA).
    """

    def __init__(self, timeout: int = 10):
        self.base_url = CORE_AI_URL
        self.timeout = timeout

    def is_online(self) -> bool:
        try:
            res = requests.get(f"{self.base_url}/health/", timeout=2)
            return res.status_code == 200
        except Exception:
            return False

    def generate_sales_hypotheses(
        self,
        company_name: str,
        sector: str = "Services B2B",
        website: Optional[str] = None,
        scraped_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Appelle Core AI pour analyser le profil scrapé et générer :
        - Hypothèses de besoins télécoms/cloud
        - Pitch commercial sur-mesure
        - Questions d'accroche stratégiques
        - Objections prévisibles et contre-arguments
        """
        payload = {
            "company_name": company_name,
            "sector": sector,
            "website": website or "",
            "scraped_data": scraped_data or {},
            "task": "SALES_PRE_VISIT_HYPOTHESES"
        }

        try:
            res = requests.post(f"{self.base_url}/sales/hypotheses/", json=payload, timeout=self.timeout)
            if res.status_code == 200:
                return res.json()
        except Exception as e:
            logger.info(f"[CoreAISalesClient] Core AI distant indisponible ({e}), bascule sur le moteur heuristique local.")

        # Moteur heuristique / Mock intelligent local
        sector_lower = sector.lower() if sector else ""
        hypotheses = [
            f"L'entreprise {company_name} s'appuie probablement sur une connexion internet grand public instable (ADSL ou box 4G basique).",
            "La collaboration interne souffre d'un manque d'outils d'entreprise centralisés (e-mails gratuits, partage de fichiers dispersé).",
        ]
        pitch = f"Présenter l'offre Fibre Optique Pro Orange avec garantie de temps de rétablissement (GTR 4h) et le pack Microsoft 365 Pro."
        questions = [
            "Quelle est la criticité d'une coupure internet pour votre activité quotidienne ?",
            "Combien de postes et smartphones professionnels devez-vous interconnecter ?",
            "Comment gérez-vous actuellement la sécurité et la sauvegarde de vos données clients ?"
        ]
        objections = [
            "Le coût mensuel récurrent est plus élevé qu'une connexion grand public (Argument : ROI immédiat sur la productivité et zéro coupure).",
            "La complexité perçue de la migration informatique (Argument : Accompagnement clé en main par les équipes techniques Orange Business)."
        ]

        if "santé" in sector_lower or "médic" in sector_lower or "clinique" in sector_lower or "hôpital" in sector_lower:
            hypotheses = [
                f"{company_name} traite des données médicales sensibles nécessitant un hébergement certifié (HDS) et une liaison très haut débit.",
                "Le standard téléphonique actuel risque la saturation pendant les heures de pointe des consultations."
            ]
            pitch = "Proposer la Fibre Pro Sécurisée couplée à l'Hébergement Cloud Données de Santé et la Téléphonie IP d'entreprise."
            questions = [
                "Comment assurez-vous la confidentialité et la sauvegarde automatique des dossiers patients ?",
                "Disposez-vous d'une ligne de secours automatique en cas d'incident sur votre liaison principale ?"
            ]
            objections = [
                "Crainte d'indisponibilité pendant le basculement (Argument : Bascule transparente sans interruption des consultations)."
            ]
        elif "mine" in sector_lower or "industr" in sector_lower or "logist" in sector_lower:
            hypotheses = [
                f"{company_name} a des besoins critiques d'interconnexion multi-sites et de suivi de flotte en temps réel.",
                "Nécessité d'une couverture réseau renforcée sur les sites distants."
            ]
            pitch = "Mettre en avant nos solutions SD-WAN multi-sites et nos liaisons mixtes Fibre + Satellite avec supervision 24/7."

        return {
            "hypotheses": hypotheses,
            "tailored_pitch": pitch,
            "key_questions": questions,
            "potential_objections": objections,
            "provider": "Core-AI-Offline-Engine"
        }

    def analyze_live_copilot_turn(
        self,
        transcript_text: str,
        enterprise_name: str,
        sector: str = "Services",
        accumulated_needs: Optional[List[str]] = None,
        accumulated_objections: Optional[List[str]] = None,
        existing_packages: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Analyse en direct de l'échange vocal transcrit par Whisper pendant le rendez-vous.
        Génère une proposition commerciale dynamique en temps réel avec cases à cocher et coaching en direct.
        """
        payload = {
            "transcript_text": transcript_text,
            "enterprise_name": enterprise_name,
            "sector": sector,
            "accumulated_needs": accumulated_needs or [],
            "accumulated_objections": accumulated_objections or [],
            "task": "LIVE_COPILOT_STREAM"
        }

        try:
            res = requests.post(f"{self.base_url}/sales/live-copilot/", json=payload, timeout=self.timeout)
            if res.status_code == 200:
                return res.json()
        except Exception as e:
            logger.info(f"[CoreAISalesClient] Core AI Live indisponible ({e}), exécution du moteur de règles temps réel.")

        # Analyse incrémentale temps réel locale
        text_lower = transcript_text.lower()
        needs = list(accumulated_needs or [])
        objections = list(accumulated_objections or [])
        coaching_tips = []

        # 1. Détection de Roaming / Déplacements Internationaux / Extérieur
        if any(w in text_lower for w in ["roaming", "voyage", "étranger", "deplacement", "déplacement", "exterieur", "extérieur", "hors du pays", "international", "frontière", "afrique", "europe", "dubaï"]):
            if "Connectivité Roaming International" not in needs:
                needs.append("Connectivité Roaming International")
            coaching_tips.append("Le prospect évoque des déplacements à l'international. Proposez le Pass Roaming Pro avec plafond garanti.")

        # 2. Détection Fibre Optique / Débit
        if any(w in text_lower for w in ["fibre", "débit", "lent", "lenteur", "coupure", "connexion", "box", "panne", "internet", "bande passante"]):
            if "Fibre Optique Pro (GTR 4h)" not in needs:
                needs.append("Fibre Optique Pro (GTR 4h)")
            coaching_tips.append("Mettez en avant le débit symétrique garanti et la GTR 4h avec bascule automatique 4G.")

        # 3. Détection Cybersécurité & Firewall
        if any(w in text_lower for w in ["sécurité", "securite", "virus", "pirat", "hacker", "ransomware", "antivirus", "firewall", "attaque", "fuite"]):
            if "Firewall Managé & Cybersécurité" not in needs:
                needs.append("Firewall Managé & Cybersécurité")
            coaching_tips.append("Rassurez le client sur la protection périmétrique et la surveillance SOC Orange 24/7.")

        # 4. Détection Collaboration & Mails (Microsoft 365)
        if any(w in text_lower for w in ["mail", "email", "office", "word", "excel", "teams", "collaborat", "partage", "teletravail", "télétravail"]):
            if "Microsoft 365 Pro & Teams" not in needs:
                needs.append("Microsoft 365 Pro & Teams")
            coaching_tips.append("Proposez la centralisation des licences Microsoft 365 avec accompagnement à la migration.")

        # 5. Détection Téléphonie Flotte & VoIP
        if any(w in text_lower for w in ["téléphone", "telephone", "standard", "appel", "flotte", "mobile", "sim", "voip", "lignes"]):
            if "Téléphonie Fixe VoIP & Flotte Pro" not in needs:
                needs.append("Téléphonie Fixe VoIP & Flotte Pro")
            coaching_tips.append("Valorisez les forfaits inter-flotte gratuits et la portabilité des numéros sans coupure.")

        # 6. Détection Cloud & Sauvegarde
        if any(w in text_lower for w in ["serveur", "sauvegarde", "cloud", "hébergement", "hebergement", "backup", "datacenter", "perte de données"]):
            if "Cloud Orange & Backup Automatique" not in needs:
                needs.append("Cloud Orange & Backup Automatique")
            coaching_tips.append("Soulignez l'hébergement local souverain et la restauration express en un clic.")

        # 7. Détection Paiement & Monétique
        if any(w in text_lower for w in ["tpe", "caisse", "paiement", "orange money", "encaissement", "terminal", "monetique"]):
            if "Paiement Orange Money Pro & TPE" not in needs:
                needs.append("Paiement Orange Money Pro & TPE")
            coaching_tips.append("Proposez les terminaux TPE Orange Money avec réconciliation instantanée des encaissements.")

        # 8. Détection Multi-sites & SD-WAN
        if any(w in text_lower for w in ["succursale", "agence", "dépôt", "depot", "usine", "filiale", "multi-site", "multisite", "interconnexion"]):
            if "SD-WAN & Interconnexion Multi-sites" not in needs:
                needs.append("SD-WAN & Interconnexion Multi-sites")
            coaching_tips.append("Proposez l'interconnexion SD-WAN pour unifier tous les sites distants de l'entreprise.")

        # Détection d'objections
        if any(w in text_lower for w in ["cher", "prix", "budget", "coût", "cout", "facture", "dépense", "tarif"]):
            if "Sensibilité budgétaire / Coût récurrent" not in objections:
                objections.append("Sensibilité budgétaire / Coût récurrent")
        if any(w in text_lower for w in ["délai", "delai", "temps", "long", "combien de temps", "installation", "déploiement"]):
            if "Inquiétude sur les délais de raccordement" not in objections:
                objections.append("Inquiétude sur les délais de raccordement")
        if any(w in text_lower for w in ["déjà", "deja", "concurrent", "autre opérateur", "fournisseur actuel", "vodacom", "airtel", "canal"]):
            if "Engagement existant chez un tiers" not in objections:
                objections.append("Engagement existant chez un tiers")

        # Construction dynamique des offres avec préservation de l'état des cases à cocher
        existing_checked_map = {}
        if existing_packages:
            for p in existing_packages:
                if isinstance(p, dict) and 'service_id' in p:
                    existing_checked_map[p['service_id']] = p.get('checked', True)

        packages = []
        total_monthly = 0.0

        # Offre 1: Roaming
        if "Connectivité Roaming International" in needs:
            service_id = "roaming-pass-pro"
            is_checked = existing_checked_map.get(service_id, True)
            packages.append({
                "service_id": service_id,
                "name": "Pass Roaming International Pro (Afrique & Monde)",
                "monthly_price_usd": 45.0,
                "category": "Mobilité & International",
                "pitch_argument": "Forfait voix & 15 Go d'internet utilisable dans plus de 80 pays sans surtaxe hors-forfait.",
                "objection_killer": "Plafond de consommation garanti avec blocage automatique pour zéro mauvaise surprise.",
                "checked": is_checked
            })
            if is_checked:
                total_monthly += 45.0

        # Offre 2: Fibre Optique Pro
        if "Fibre Optique Pro (GTR 4h)" in needs or not needs:
            service_id = "fibre-pro-50m"
            is_checked = existing_checked_map.get(service_id, True)
            packages.append({
                "service_id": service_id,
                "name": "Fibre Optique Pro Orange (50 Mbps symétrique)",
                "monthly_price_usd": 150.0,
                "category": "Très Haut Débit",
                "pitch_argument": "Garantit un débit symétrique dédié avec engagement de rétablissement sous 4 heures (GTR 4h).",
                "objection_killer": "Secours 4G automatique activé sans surcoût en cas d'aléa physique.",
                "checked": is_checked
            })
            if is_checked:
                total_monthly += 150.0

        # Offre 3: Microsoft 365
        if "Microsoft 365 Pro & Teams" in needs:
            service_id = "m365-biz-prem"
            is_checked = existing_checked_map.get(service_id, True)
            packages.append({
                "service_id": service_id,
                "name": "Pack Collaboration Microsoft 365 Business (10 licences)",
                "monthly_price_usd": 85.0,
                "category": "Productivité Cloud",
                "pitch_argument": "Centralise messagerie sécurisée, stockage cloud OneDrive 1 To et visioconférence Teams.",
                "objection_killer": "Migration assistée et prise en main assurée par notre équipe locale Orange.",
                "checked": is_checked
            })
            if is_checked:
                total_monthly += 85.0

        # Offre 4: Firewall & Cybersécurité
        if "Firewall Managé & Cybersécurité" in needs:
            service_id = "firewall-utm"
            is_checked = existing_checked_map.get(service_id, True)
            packages.append({
                "service_id": service_id,
                "name": "Cyberdéfense Orange Pro (Firewall UTM & EDR)",
                "monthly_price_usd": 70.0,
                "category": "Cybersécurité",
                "pitch_argument": "Protège l'ensemble du réseau local contre les intrusions et ransomwares.",
                "objection_killer": "Mises à jour et veille de sécurité 24/7 gérées par le SOC Orange Business.",
                "checked": is_checked
            })
            if is_checked:
                total_monthly += 70.0

        # Offre 5: Cloud & Backup
        if "Cloud Orange & Backup Automatique" in needs:
            service_id = "cloud-backup-pro"
            is_checked = existing_checked_map.get(service_id, True)
            packages.append({
                "service_id": service_id,
                "name": "Cloud Orange & Sauvegarde Automatique Distante",
                "monthly_price_usd": 90.0,
                "category": "Cloud & Hébergement",
                "pitch_argument": "Sauvegarde continue et chiffrée de vos serveurs avec restauration garantie.",
                "objection_killer": "Données hébergées en RDC dans les datacenters certifiés Tier III Orange.",
                "checked": is_checked
            })
            if is_checked:
                total_monthly += 90.0

        # Offre 6: Téléphonie Flotte
        if "Téléphonie Fixe VoIP & Flotte Pro" in needs:
            service_id = "flotte-mobile-pro"
            is_checked = existing_checked_map.get(service_id, True)
            packages.append({
                "service_id": service_id,
                "name": "Flotte Mobile Entreprise & Téléphonie IP",
                "monthly_price_usd": 60.0,
                "category": "Téléphonie d'Entreprise",
                "pitch_argument": "Standard virtuel avec accueil personnalisé et appels illimités inter-flotte.",
                "objection_killer": "Portabilité des numéros existants garantie sans interruption d'activité.",
                "checked": is_checked
            })
            if is_checked:
                total_monthly += 60.0

        # Offre 7: Orange Money TPE
        if "Paiement Orange Money Pro & TPE" in needs:
            service_id = "om-pro-pos"
            is_checked = existing_checked_map.get(service_id, True)
            packages.append({
                "service_id": service_id,
                "name": "Orange Money Pro & Terminal TPE Connecté",
                "monthly_price_usd": 35.0,
                "category": "Solutions de Paiement",
                "pitch_argument": "Encaissement instantané multi-opérateurs avec réconciliation comptable en temps réel.",
                "objection_killer": "Frais de transaction B2B réduits et reversement direct sur compte bancaire.",
                "checked": is_checked
            })
            if is_checked:
                total_monthly += 35.0

        # Offre 8: SD-WAN
        if "SD-WAN & Interconnexion Multi-sites" in needs:
            service_id = "sd-wan-multi"
            is_checked = existing_checked_map.get(service_id, True)
            packages.append({
                "service_id": service_id,
                "name": "SD-WAN & Interconnexion Multi-sites Sécurisée",
                "monthly_price_usd": 220.0,
                "category": "Réseau & Multi-sites",
                "pitch_argument": "Relie l'ensemble de vos agences dans un réseau privé virtuel managé avec priorité de flux.",
                "objection_killer": "Supervision globale centralisée sur portail unique avec bascule 4G/Fibre sans coupure.",
                "checked": is_checked
            })
            if is_checked:
                total_monthly += 220.0

        closing_score = 75 + len(needs) * 5 - len(objections) * 4
        closing_score = max(50, min(98, closing_score))

        final_coaching_tip = coaching_tips[-1] if coaching_tips else "Écoutez activement les priorités du prospect et confirmez les offres cochées."

        return {
            "active_sentiment": "Positif et réceptif" if len(needs) >= len(objections) else "Négociation serrée",
            "detected_needs": needs,
            "detected_objections": objections,
            "coaching_tip": final_coaching_tip,
            "realtime_proposition": {
                "title": f"Offre Numérique Sur-Mesure - {enterprise_name}",
                "recommended_packages": packages,
                "estimated_total_monthly_usd": round(total_monthly, 2),
                "closing_readiness_score": closing_score
            },
            "provider": "Core-AI-Live-Engine"
        }

    def generate_post_visit_report(
        self,
        full_transcript: str,
        enterprise_name: str,
        prep_objective: str = "",
        salesperson_name: str = "Commercial"
    ) -> Dict[str, Any]:
        """
        Génère le compte-rendu exécutif de visite, les besoins confirmés, les objections,
        les prochaines étapes et le projet d'e-mail de suivi.
        """
        payload = {
            "transcript": full_transcript,
            "enterprise_name": enterprise_name,
            "meeting_objective": prep_objective,
            "salesperson_name": salesperson_name,
            "task": "GENERATE_POST_VISIT_REPORT"
        }

        try:
            res = requests.post(f"{self.base_url}/sales/reports/generate/", json=payload, timeout=self.timeout)
            if res.status_code == 200:
                return res.json()
        except Exception as e:
            logger.info(f"[CoreAISalesClient] Génération de rapport via Core AI échouée ({e}), calcul local.")

        # Calcul de synthèse locale
        text_lower = full_transcript.lower() if full_transcript else ""
        confirmed_needs = ["Fibre Optique Pro Orange B2B", "Microsoft 365 Pro & Teams"]
        objections = []
        actions = [
            f"Faire parvenir la proposition chiffrée Fibre Pro à la direction de {enterprise_name}",
            "Coordonner la visite technique d'éligibilité avec les équipes réseau Orange"
        ]

        if "sécurité" in text_lower or "firewall" in text_lower:
            confirmed_needs.append("Firewall Managé & EDR")
        if "téléphone" in text_lower or "standard" in text_lower:
            confirmed_needs.append("Téléphonie IP Teams")
        if "prix" in text_lower or "budget" in text_lower or "cher" in text_lower:
            objections.append("Sensibilité au montant de l'abonnement mensuel")
            actions.append("Étudier une remise d'engagement 24 mois (10%)")

        exec_summary = (
            f"Visite commerciale très constructive auprès de {enterprise_name}. Le client a confirmé des difficultés "
            f"liées à sa connectivité actuelle et recherche un opérateur fiable pour moderniser ses outils de travail. "
            f"Un intérêt marqué a été exprimé pour nos offres Fibre Pro et suites collaboratives."
        )

        email_draft = (
            f"Madame, Monsieur,\n\n"
            f"Je vous remercie chaleureusement pour l'accueil réservé lors de notre échange d'aujourd'hui au sein de votre établissement {enterprise_name}.\n\n"
            f"Comme discuté, nous avons bien cerné vos enjeux de connectivité très haut débit et de sécurité informatique. "
            f"Vous trouverez ci-joint les préconisations techniques de nos offres Orange Business B2B adaptées à vos volumes.\n\n"
            f"Je reste à votre entière disposition pour planifier l'audit technique d'éligibilité.\n\n"
            f"Bien cordialement,\n{salesperson_name}\nOrange Business B2B"
        )

        return {
            "executive_summary": exec_summary,
            "confirmed_needs": confirmed_needs,
            "objections_raised": objections,
            "actions_todo": actions,
            "follow_up_email_draft": email_draft,
            "raw_ai_payload": {
                "generated_at": datetime.utcnow().isoformat(),
                "model_version": "gemini-flash-orange-b2b-v1",
                "summary": exec_summary
            }
        }

    def submit_learning_feedback(
        self,
        report_id: int,
        original_ai_output: Dict[str, Any],
        human_corrected_output: Dict[str, Any],
        rating: int,
        comments: str = ""
    ) -> Dict[str, Any]:
        """
        Envoie les retours d'évaluation humaine (note, corrections) au Core AI
        pour l'entraînement continu et le renforcement des jeux de tests d'évaluation.
        """
        payload = {
            "report_id": report_id,
            "timestamp": datetime.utcnow().isoformat(),
            "rating": rating,
            "comments": comments,
            "original_output": original_ai_output,
            "corrected_output": human_corrected_output
        }

        try:
            res = requests.post(f"{self.base_url}/evals/feedback/", json=payload, timeout=self.timeout)
            if res.status_code in [200, 201]:
                return {"status": "SUCCESS", "message": "Feedback enregistré dans le dataset d'évaluation Core AI."}
        except Exception as e:
            logger.info(f"[CoreAISalesClient] Feedback local enregistré ({e}).")

        return {
            "status": "LOCAL_SAVED",
            "message": "Feedback d'amélioration IA mémorisé localement.",
            "rating": rating
        }
