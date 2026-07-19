from catalog.models import ServiceCatalog
from kam.models import ProspectDossier
from twin.models import BusinessTwin

def parse_message_for_profile(text, current_profile):
    """
    Analyses the text of the user message to extract information and update the profile.
    """
    text_lower = text.lower()
    
    # Initialize profile fields if empty
    profile = {
        "sector": current_profile.get("sector", ""),
        "company_size_estimate": current_profile.get("company_size_estimate", ""),
        "current_problems": list(current_profile.get("current_problems", [])),
        "current_tools": list(current_profile.get("current_tools", [])),
        "locations_count": current_profile.get("locations_count", 1)
    }

    # 1. Sector detection
    if any(k in text_lower for k in ["médical", "clinique", "cabinet", "hôpital", "médecin", "docteur", "santé"]):
        profile["sector"] = "Médical / Santé"
    elif any(k in text_lower for k in ["magasin", "boutique", "vente", "commerce", "retail", "restaurant", "café"]):
        profile["sector"] = "Commerce / Retail"
    elif any(k in text_lower for k in ["usine", "production", "manufacture", "industriel", "atelier"]):
        profile["sector"] = "Industrie"
    elif any(k in text_lower for k in ["école", "formation", "université", "étudiant", "cours"]):
        profile["sector"] = "Éducation / Formation"
    elif any(k in text_lower for k in ["bureau", "conseil", "service", "agence", "freelance"]):
        profile["sector"] = "Services aux entreprises"
    # 2 & 3. Locations and Size detection from extracted numbers
    numbers = []
    for word in text_lower.split():
        word_clean = "".join(c for c in word if c.isdigit())
        if word_clean.isdigit():
            numbers.append(int(word_clean))

    if numbers:
        # Sort numbers so we can assign them logically:
        # Usually, the larger number is the company size (collaborateurs)
        # and the smaller number is the locations count (sites)
        if len(numbers) >= 2:
            locations = min(numbers)
            size_val = max(numbers)
            profile["locations_count"] = locations
        else:
            # Only one number, figure out if it is size or site
            val = numbers[0]
            if "site" in text_lower or "agence" in text_lower or "bureau" in text_lower:
                profile["locations_count"] = val
                size_val = None
            else:
                size_val = val

        if size_val is not None:
            if size_val >= 500:
                profile["company_size_estimate"] = "500+ employés"
            elif size_val >= 100:
                profile["company_size_estimate"] = "100-499 employés"
            elif size_val >= 20:
                profile["company_size_estimate"] = "20-99 employés"
            elif size_val >= 2:
                profile["company_size_estimate"] = "2-19 employés"

    # 4. Problems detection
    problems_map = {
        "lent": "Réseau lent / Déconnexions fréquentes",
        "coupe": "Réseau instable et coupures de connexion",
        "wifi": "Mauvaise couverture Wi-Fi dans les locaux",
        "sécurité": "Craintes d'attaques ou de piratage",
        "hacker": "Besoins de renforcement de la cybersécurité",
        "virus": "Vulnérabilité aux virus / ransomwares",
        "partage": "Difficultés de partage de fichiers à distance",
        "distance": "Télétravail complexe et accès VPN instable",
        "téléphone": "Standard téléphonique obsolète ou coûteux",
        "visio": "Problèmes de qualité d'appels et de visioconférence",
        "carte": "Difficultés avec les terminaux de paiement",
        "paiement": "Besoins d'optimisation des encaissements clients"
    }
    for key, value in problems_map.items():
        if key in text_lower and value not in profile["current_problems"]:
            profile["current_problems"].append(value)

    # 5. Tools detection
    tools_map = {
        "outlook": "Microsoft Outlook",
        "excel": "Microsoft Excel",
        "teams": "Microsoft Teams",
        "papier": "Gestion papier traditionnelle",
        "adsl": "Connexion ADSL standard",
        "box": "Box internet grand public",
        "fibre": "Fibre optique standard",
        "serveur": "Serveur physique local"
    }
    for key, value in tools_map.items():
        if key in text_lower and value not in profile["current_tools"]:
            profile["current_tools"].append(value)

    return profile

def generate_next_step(profile, message_count):
    """
    Formulates the next question or determines if qualification is complete.
    """
    if message_count == 1:
        # Step 1 answered. We ask about problems.
        if not profile["sector"]:
            profile["sector"] = "Médical / Santé"
        if not profile["company_size_estimate"]:
            profile["company_size_estimate"] = "20-99 employés"
        return {
            "next_question": "Merci pour ces précisions concernant votre activité. Quels sont les principaux ralentissements, coupures de réseau ou problèmes de communication/collaboration que vous rencontrez au quotidien ?",
            "is_qualified": False
        }
    elif message_count == 2:
        # Step 2 answered. We ask about current tools and security.
        if not profile["current_problems"]:
            profile["current_problems"] = [
                "Réseau lent / Déconnexions fréquentes",
                "Mauvaise couverture Wi-Fi dans les locaux"
            ]
        return {
            "next_question": "C'est bien noté pour les lenteurs réseau et Wi-Fi. Quels outils collaboratifs (e.g. Teams, emails) et solutions de stockage utilisez-vous aujourd'hui, et comment gérez-vous la sécurité de vos données ?",
            "is_qualified": False
        }
    else:
        # Step 3 (or more) answered. Qualification is complete!
        if not profile["current_tools"]:
            profile["current_tools"] = [
                "Box internet grand public",
                "Serveur physique local"
            ]
        # In case problems or tools are still empty, ensure fallback values exist
        if not profile["current_problems"]:
            profile["current_problems"] = [
                "Réseau lent / Déconnexions fréquentes",
                "Mauvaise couverture Wi-Fi dans les locaux"
            ]
        return {
            "next_question": "Parfait ! J'ai réuni toutes les informations nécessaires pour qualifier vos besoins et modéliser votre transformation numérique. Votre Business Twin interactif et la roadmap de transition sont désormais générés ci-dessous.",
            "is_qualified": True
        }

def generate_recommendations_and_twin(profile, conversation):
    """
    Matches the profile to catalog services and builds the Business Twin.
    """
    recommended_services_data = []
    current_state = []
    proposed_state = []
    roadmap = []
    
    # Get all catalog services to query them
    all_services = {s.name: s for s in ServiceCatalog.objects.all()}
    
    # 1. Match network needs
    has_network_problem = any("réseau" in p.lower() or "lent" in p.lower() or "coupe" in p.lower() or "wifi" in p.lower() for p in profile["current_problems"])
    is_multi_site = profile["locations_count"] > 1
    
    if has_network_problem or is_multi_site:
        if 'Fibre Optique Pro' in all_services:
            s = all_services['Fibre Optique Pro']
            recommended_services_data.append({
                "service_id": s.id,
                "name": s.name,
                "category": s.category,
                "priority": "HIGH",
                "reasoning": "Remplace vos liaisons lentes par une fibre pro symétrique avec garantie de temps de rétablissement (GTR 4h) pour assurer la continuité d'activité."
            })
            current_state.append("Connexion instable ou lente entravant le travail quotidien")
            proposed_state.append("Connexion Fibre Pro très haut débit avec basculement de secours automatique")
            
        if is_multi_site and 'SD-WAN Managé' in all_services:
            s = all_services['SD-WAN Managé']
            recommended_services_data.append({
                "service_id": s.id,
                "name": s.name,
                "category": s.category,
                "priority": "HIGH",
                "reasoning": "Interconnecte vos différents sites de façon sécurisée et optimise le trafic réseau vers vos applications cloud."
            })
            current_state.append(f"Difficulté à interconnecter vos {profile['locations_count']} sites géographiques")
            proposed_state.append("Réseau privé d'entreprise unifié et sécurisé via SD-WAN managé")

    # 2. Match security needs
    has_security_needs = any("sécurité" in p.lower() or "virus" in p.lower() or "cyber" in p.lower() or "pirat" in p.lower() for p in profile["current_problems"])
    if has_security_needs:
        if 'Firewall Managé' in all_services:
            s = all_services['Firewall Managé']
            recommended_services_data.append({
                "service_id": s.id,
                "name": s.name,
                "category": s.category,
                "priority": "HIGH",
                "reasoning": "Protège le réseau de votre entreprise contre les intrusions extérieures et sécurise les connexions de vos télétravailleurs."
            })
            current_state.append("Absence de filtrage réseau et vulnérabilité aux attaques extérieures")
            proposed_state.append("Protection réseau périmétrique 24h/24 par Firewall Managé")
            
        if 'EDR & Antivirus Pro' in all_services:
            s = all_services['EDR & Antivirus Pro']
            recommended_services_data.append({
                "service_id": s.id,
                "name": s.name,
                "category": s.category,
                "priority": "HIGH",
                "reasoning": "Surveille vos postes de travail en temps réel contre les ransomwares avec une équipe d'experts prête à intervenir."
            })
            current_state.append("Risques d'infections par ransomware sur les postes utilisateurs")
            proposed_state.append("Protection EDR comportementale supervisée par un SOC")

    # 3. Match health compliance
    is_medical = "médical" in profile["sector"].lower() or "santé" in profile["sector"].lower()
    if is_medical:
        if 'Hébergement de Données de Santé (HDS)' in all_services:
            s = all_services['Hébergement de Données de Santé (HDS)']
            recommended_services_data.append({
                "service_id": s.id,
                "name": s.name,
                "category": s.category,
                "priority": "CRITICAL",
                "reasoning": "Assure la conformité légale totale pour l'hébergement de vos dossiers patients et de vos logiciels médicaux."
            })
            current_state.append("Risque de non-conformité réglementaire sur les données patients")
            proposed_state.append("Hébergement cloud souverain certifié HDS conforme au Code de la Santé")

    # 4. Match collaboration needs
    has_collab_needs = any("partage" in p.lower() or "téléphon" in p.lower() or "visio" in p.lower() or "collabor" in p.lower() for p in profile["current_problems"])
    if has_collab_needs or not recommended_services_data: # Fallback or collaborative
        if 'Microsoft 365 Pro & Teams' in all_services:
            s = all_services['Microsoft 365 Pro & Teams']
            recommended_services_data.append({
                "service_id": s.id,
                "name": s.name,
                "category": s.category,
                "priority": "MEDIUM",
                "reasoning": "Fournit une suite moderne d'outils collaboratifs (Teams, Sharepoint, Outlook) pour le travail d'équipe et le télétravail."
            })
            current_state.append("Outils de communication cloisonnés ou obsolètes")
            proposed_state.append("Suite collaborative unifiée Microsoft 365 avec messagerie pro")
            
        if any("téléphon" in p.lower() for p in profile["current_problems"]) and 'Téléphonie Teams (VoIP)' in all_services:
            s = all_services['Téléphonie Teams (VoIP)']
            recommended_services_data.append({
                "service_id": s.id,
                "name": s.name,
                "category": s.category,
                "priority": "MEDIUM",
                "reasoning": "Remplace votre standard téléphonique fixe par une solution VoIP moderne intégrée directement dans Teams."
            })
            current_state.append("Standard téléphonique physique rigide et coûteux")
            proposed_state.append("Téléphonie cloud VoIP intégrée dans Microsoft Teams")

    # 5. Match payment needs
    is_retail = "commerce" in profile["sector"].lower() or "retail" in profile["sector"].lower()
    if is_retail:
        if 'Terminal de Paiement (TPE) Connecté' in all_services:
            s = all_services['Terminal de Paiement (TPE) Connecté']
            recommended_services_data.append({
                "service_id": s.id,
                "name": s.name,
                "category": s.category,
                "priority": "HIGH",
                "reasoning": "Permet des encaissements par carte ultra-rapides et sans contact avec reporting centralisé en temps réel."
            })
            current_state.append("Lenteur ou pannes régulières d'encaissement CB")
            proposed_state.append("TPE connectés intelligents en Wi-Fi / 4G avec reporting de vente")

    # Fill defaults if states are empty
    if not current_state:
        current_state.append("Infrastructure télécoms et outils logiciels hétérogènes")
    if not proposed_state:
        proposed_state.append("Plateforme de services managés (MSP) unifiée et sécurisée")

    # Generate roadmap steps
    roadmap.append("Étape 1 : Audit d'éligibilité et validation de l'architecture technique")
    roadmap.append("Étape 2 : Déploiement de la connectivité réseau sécurisée (Fibre / Firewall)")
    roadmap.append("Étape 3 : Migration des outils de collaboration et des applications cloud")
    roadmap.append("Étape 4 : Session de formation et d'accompagnement au changement des utilisateurs")
    
    # Save objects in db
    dossier, created = ProspectDossier.objects.get_or_create(
        conversation=conversation,
        defaults={
            "source": ProspectDossier.INBOUND_CONVERSATION,
            "status": ProspectDossier.NEW,
            "raw_qualification_data": {
                "profile": profile,
                "message_count": conversation.messages.count()
            }
        }
    )
    
    # Update raw qualification data if dossier already existed
    if not created:
        dossier.raw_qualification_data = {
            "profile": profile,
            "message_count": conversation.messages.count()
        }
        dossier.save()

    # Create/update BusinessTwin
    twin, t_created = BusinessTwin.objects.get_or_create(
        prospect_dossier=dossier,
        defaults={
            "current_state": current_state,
            "proposed_state": proposed_state,
            "recommended_services": recommended_services_data,
            "roadmap": roadmap
        }
    )
    if not t_created:
        twin.current_state = current_state
        twin.proposed_state = proposed_state
        twin.recommended_services = recommended_services_data
        twin.roadmap = roadmap
        twin.save()

    return recommended_services_data, {
        "current_state": current_state,
        "proposed_state": proposed_state,
        "recommended_services": recommended_services_data,
        "roadmap": roadmap
    }
