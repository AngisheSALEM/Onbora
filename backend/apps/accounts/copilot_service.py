import re
import json
from typing import Dict, Any, List, Optional
from django.utils import timezone
from .models import User, UserAIAssistant, AIAssistantConversation, AIAssistantMessage
from sales.models import Enterprise, Plaque, AdminDirective
from kam.models import KamAppointment, KamVisitReport

# Role-based default configurations
ROLE_CONFIGS = {
    User.KAM: {
        'default_name': "Codex B2B",
        'role_scope': "KAM",
        'allowed_actions': [
            {
                'code': 'ANALYZE_AGENDA',
                'label': "Analyser mon planning & priorités",
                'description': "Scanne les rendez-vous du jour et propose un ordre de priorité selon le potentiel CA"
            },
            {
                'code': 'RESEARCH_BRIEF',
                'label': "Recherche & Brief Info Client",
                'description': "Génère instantanément une fiche brief stratégique sur un compte cible (CA, décideurs, offres)"
            },
            {
                'code': 'DRAFT_FOLLOWUP_EMAIL',
                'label': "Rédiger un email de relance",
                'description': "Génère un email commercial percutant sans jargon adapté aux objections du client"
            },
            {
                'code': 'QUALIFY_BANT',
                'label': "Qualification BANT d'un compte",
                'description': "Évalue le budget, l'autorité, le besoin et le calendrier d'un prospect clé"
            }
        ],
        'system_prompt': (
            "Tu es le Codex B2B Onbora, l'assistant IA exécutif dédié aux Key Account Managers (KAM). "
            "Ton rôle est d'éliminer toutes les tâches chronophages : préparer les briefs pré-visite, "
            "prioriser l'agenda commercial selon le potentiel de chiffre d'affaires, rédiger des relances percutantes "
            "et formuler des recommandations stratégiques. Sois direct, chiffré, orienté closing et sans fioritures."
        )
    },
    User.SUPERVISOR: {
        'default_name': "Copilote Back-Office & Dispatch",
        'role_scope': "SUPERVISOR",
        'allowed_actions': [
            {
                'code': 'DRAFT_DIRECTIVE',
                'label': "Rédiger une directive opérationnelle",
                'description': "Prépare une instruction formelle pour un commercial terrain ou une plaque"
            },
            {
                'code': 'AUTO_DISPATCH_PLAQUE',
                'label': "Dispatcher les commerciaux sur une plaque",
                'description': "Répartit équitablement les entreprises non affectées entre les commerciaux actifs"
            },
            {
                'code': 'AUDIT_COVERAGE',
                'label': "Auditer la couverture des plaques",
                'description': "Analyse le taux de visite et les zones blanches nécessitant un renfort terrain"
            },
            {
                'code': 'AUDIT_COMMERCIALS',
                'label': "Classement & Performance Commerciaux",
                'description': "Synthèse des points d'incitation, visites déclarées et conversions obtenues"
            }
        ],
        'system_prompt': (
            "Tu es le Copilote Back-Office Terrain Onbora. Ton rôle est d'assister le superviseur dans "
            "la gestion de son réseau de commerciaux terrain : rédiger des directives précises, auditer "
            "la couverture des plaques géographiques, automatiser le dispatch des entreprises et optimiser les tournées."
        )
    },
    User.KAM_MANAGER: {
        'default_name': "Copilote Direction KAM Office",
        'role_scope': "KAM_MANAGER",
        'allowed_actions': [
            {
                'code': 'REBALANCE_PORTFOLIO',
                'label': "Équilibrer les portefeuilles KAM",
                'description': "Audite la charge entre spécialistes Grands Comptes et PME et suggère des réaffectations"
            },
            {
                'code': 'DRAFT_DIRECTIVE',
                'label': "Émettre une directive aux KAMs",
                'description': "Rédige et diffuse une consigne de prospection ou de closing aux chargés d'affaires"
            },
            {
                'code': 'PIPELINE_SYNTHESIS',
                'label': "Synthèse du pipeline & closing",
                'description': "Bilan du volume d'affaires en cours, taux de transformation et comptes stratégiques à risque"
            }
        ],
        'system_prompt': (
            "Tu es le Copilote Stratégique de la Direction KAM Office Onbora. Ton rôle est d'assister "
            "le gérant du KAM Office dans le pilotage des 15-30 comptes stratégiques, l'affectation optimale "
            "des KAMs selon leur spécialisation (Grands Comptes vs PME) et l'atteinte des objectifs de chiffre d'affaires."
        )
    },
    User.ADMIN: {
        'default_name': "Copilote Super Admin",
        'role_scope': "ADMIN",
        'allowed_actions': [
            {
                'code': 'AUDIT_SEGMENTATION',
                'label': "Auditer les seuils de segmentation",
                'description': "Vérifie l'impact des seuils TPE/PME sur la répartition globale des 1 000 comptes"
            },
            {
                'code': 'GLOBAL_DIRECTIVE',
                'label': "Diffuser une directive générale",
                'description': "Rédige une instruction stratégique destinée au Back-Office ou au KAM Office"
            },
            {
                'code': 'GLOBAL_KPI_SUMMARY',
                'label': "Bilan consolidé de la plateforme",
                'description': "Rapprochement des performances Back-Office terrain et KAM Office grands comptes"
            }
        ],
        'system_prompt': (
            "Tu es le Copilote Gouvernance & Super Administration Onbora. Ton rôle est de superviser "
            "la cohérence globale de la plateforme, les règles de segmentation, les comptes gestionnaires "
            "et les flux d'instructions transversales."
        )
    }
}


def get_or_create_assistant(user: User) -> UserAIAssistant:
    """
    Récupère ou initialise l'instance d'assistant IA dédiée à un utilisateur.
    Chaque compte dispose de son ID d'assistant unique et de ses règles de rôle.
    """
    cfg = ROLE_CONFIGS.get(user.role, ROLE_CONFIGS[User.KAM])
    display_name = f"{cfg['default_name']} - {user.first_name or user.username}"
    
    assistant, created = UserAIAssistant.objects.get_or_create(
        user=user,
        defaults={
            'name': display_name,
            'role_scope': user.role,
            'allowed_actions': cfg['allowed_actions'],
            'system_prompt': cfg['system_prompt'],
            'avatar': 'bot',
        }
    )
    return assistant


def process_copilot_turn(
    assistant: UserAIAssistant,
    conversation: AIAssistantConversation,
    user_message: str
) -> AIAssistantMessage:
    """
    Exécute un tour de conversation avec l'assistant IA selon les autorisations du rôle.
    Détecte les intentions d'automatisation (planning, brief info, directives, dispatch)
    et produit une réponse structurée avec cartes d'action exécutables.
    """
    clean_text = (user_message or '').strip()
    lowered = clean_text.lower()
    user = assistant.user
    role = user.role

    action_type = None
    action_payload = {}
    action_result = {}
    action_status = 'NONE'
    response_content = ""

    # =========================================================================
    # 1. ACTIONS KAM : PLANNING, PRIORITÉS & RECHERCHE DE BRIEF
    # =========================================================================
    if role == User.KAM:
        # A. ANALYSE DU PLANNING & PROPOSITION DE PRIORITÉS
        if any(w in lowered for w in ['planning', 'agenda', 'priorité', 'priorites', 'aujourd\'hui', 'programme', 'rdv', 'rendez-vous']):
            action_type = 'ANALYZE_AGENDA'
            action_status = 'EXECUTED'
            
            # Récupération des RDV du jour / à venir
            now = timezone.now()
            appointments = KamAppointment.objects.filter(kam=user, scheduled_at__gte=now.replace(hour=0, minute=0, second=0)).order_by('scheduled_at')[:5]
            
            # Récupération des comptes assignés non visités à fort potentiel
            unvisited_accounts = Enterprise.objects.filter(assigned_kam=user, is_visited=False).order_by('-annual_revenue')[:3]
            
            items = []
            if appointments.exists():
                for apt in appointments:
                    items.append({
                        'type': 'APPOINTMENT',
                        'time': apt.scheduled_at.strftime('%H:%M'),
                        'account_name': apt.enterprise.name if apt.enterprise else "Rendez-vous",
                        'meeting_type': apt.get_meeting_type_display(),
                        'objective': apt.objective or "Étape de qualification",
                        'priority': 'HAUTE' if (apt.enterprise and apt.enterprise.annual_revenue > 500000) else 'NORMALE'
                    })
            
            suggested_prospects = []
            for acc in unvisited_accounts:
                suggested_prospects.append({
                    'account_name': acc.name,
                    'revenue': f"{acc.annual_revenue:,.0f} $",
                    'sector': acc.sector,
                    'contact': acc.contact_name or "Non renseigné",
                    'reason': "Compte à fort CA non encore visité ce trimestre"
                })

            action_result = {
                'today_appointments_count': len(items),
                'appointments': items,
                'suggested_prospects': suggested_prospects,
            }

            response_content = (
                f"J'ai analysé votre agenda et votre portefeuille commercial, {user.first_name or user.username}.\n\n"
            )
            if items:
                response_content += f"Vous avez **{len(items)} rendez-vous planifié(s)** aujourd'hui :\n"
                for it in items:
                    response_content += f"• **{it['time']}** : {it['account_name']} ({it['meeting_type']}) — *{it['objective']}*\n"
            else:
                response_content += "Aucun rendez-vous formel n'est encore pointé aujourd'hui.\n"

            if suggested_prospects:
                response_content += "\n**Priorités d'action suggérées par le Codex :**\n"
                for sp in suggested_prospects:
                    response_content += f"1. **Contacter {sp['account_name']}** (CA: {sp['revenue']}, Secteur: {sp['sector']}) — {sp['reason']}.\n"

            response_content += "\nSouhaitez-vous que je génère un brief stratégique sur l'un de ces comptes ?"

        # B. RECHERCHE & SYNTHÈSE D'UN BRIEF CLIENT
        elif any(w in lowered for w in ['brief', 'info sur', 'recherche', 'analyse compte', 'dossier', 'rawbank', 'vodacom', 'orange', 'airtel', 'bcdc', 'equity']):
            action_type = 'RESEARCH_BRIEF'
            action_status = 'EXECUTED'

            # Trouver le nom du compte ciblé
            matched_ent = None
            assigned_accounts = Enterprise.objects.filter(assigned_kam=user)
            
            for ent in assigned_accounts:
                if ent.name.lower() in lowered:
                    matched_ent = ent
                    break
            
            if not matched_ent:
                # Recherche globale dans la base CRM
                words = [w for w in re.findall(r'\b[A-Za-z0-9_-]{3,}\b', clean_text) if w.lower() not in ['brief', 'infos', 'info', 'sur', 'pour', 'le', 'la', 'les', 'des', 'avec']]
                for w in words:
                    candidate = Enterprise.objects.filter(name__icontains=w).first()
                    if candidate:
                        matched_ent = candidate
                        break

            if not matched_ent:
                matched_ent = assigned_accounts.first() or Enterprise.objects.first()

            if matched_ent:
                # Historique des visites du compte
                past_visits = KamVisitReport.objects.filter(enterprise=matched_ent).order_by('-created_at')[:2]
                past_notes = [v.executive_summary for v in past_visits if v.executive_summary]

                action_result = {
                    'account_id': matched_ent.id,
                    'name': matched_ent.name,
                    'crm_id': matched_ent.crm_id,
                    'sector': matched_ent.sector or "Services Généraux",
                    'city': matched_ent.city,
                    'annual_revenue': f"{matched_ent.annual_revenue:,.0f} $",
                    'employee_count': matched_ent.employee_count,
                    'contact_name': matched_ent.contact_name or "Direction Générale",
                    'contact_phone': matched_ent.contact_phone,
                    'current_operator': matched_ent.current_operator or "Opérateur historique",
                    'current_connectivity': matched_ent.current_connectivity or "Fibre dédiée",
                    'recommended_solution': matched_ent.recommended_solution or "Fibre Entreprise Haut Débit + Flotte Voix VIP",
                    'conversion_status': matched_ent.conversion_status,
                    'past_interactions_count': len(past_notes),
                }

                response_content = (
                    f"Voici la **Fiche Brief Stratégique** préparée par le Codex pour **{matched_ent.name}** :\n\n"
                    f"• **Chiffre d'affaires estimé :** {matched_ent.annual_revenue:,.0f} $ (Effectif: {matched_ent.employee_count} employés)\n"
                    f"• **Localisation & Ville :** {matched_ent.city} ({matched_ent.commune or 'Gombe'})\n"
                    f"• **Décideur référencé :** {matched_ent.contact_name or 'N/A'} ({matched_ent.contact_phone or 'Tél non renseigné'})\n"
                    f"• **Opérateur actuel :** {matched_ent.current_operator or 'Non précisé'} (Type: {matched_ent.current_connectivity})\n"
                    f"• **Solution cible recommandée :** {matched_ent.recommended_solution or 'Connectivité Dédiée & Flotte Pro'}\n\n"
                    f"**Angle d'attaque commercial conseillé :** Mettre l'accent sur la redondance des liaisons de télécommunication "
                    f"et la garantie de rétablissement en moins de 4 heures pour sécuriser leur activité critique.\n\n"
                    f"Voulez-vous que je rédige un email d'approche ou que je planifie un rendez-vous dans votre agenda ?"
                )
            else:
                response_content = "Veuillez préciser le nom de l'entreprise dont vous souhaitez obtenir le brief stratégique."

        # C. RÉDACTION EMAIL DE RELANCE OU CLOSING
        elif any(w in lowered for w in ['email', 'mail', 'relance', 'rédige', 'ecris', 'écris']):
            action_type = 'DRAFT_FOLLOWUP_EMAIL'
            action_status = 'PROPOSED'
            
            sample_account = Enterprise.objects.filter(assigned_kam=user).first() or Enterprise.objects.first()
            acc_name = sample_account.name if sample_account else "la société cliente"
            contact_name = (sample_account.contact_name if sample_account else None) or "Monsieur le Directeur"

            email_body = (
                f"Objet : Suite à notre échange - Sécurisation de la connectivité chez {acc_name}\n\n"
                f"Bonjour {contact_name},\n\n"
                f"Je tiens à vous remercier pour le temps accordé lors de notre récente discussion. "
                f"Comme convenu, nous avons dimensionné notre offre de connectivité fibre Très Haut Débit "
                f"avec une garantie de disponibilité de 99.8% et un engagement de rétablissement sous 4 heures.\n\n"
                f"Cette infrastructure permettra à {acc_name} d'éliminer toute rupture opérationnelle "
                f"tout en optimisant vos coûts actuels de télécommunication.\n\n"
                f"Je vous propose un point d'étape de 20 minutes ce jeudi à 11h ou vendredi à 14h pour vous présenter "
                f"la convention de service et convenir du planning de raccordement.\n\n"
                f"Bien cordialement,\n"
                f"{user.first_name or user.username} — Key Account Manager Onbora"
            )

            action_result = {
                'subject': f"Suite à notre échange - Sécurisation de la connectivité chez {acc_name}",
                'recipient': contact_name,
                'email_body': email_body
            }

            response_content = (
                f"Voici la proposition d'email de suivi commercial rédigée pour **{acc_name}** :\n\n"
                f"```text\n{email_body}\n```\n\n"
                f"Vous pouvez la copier en un clic ou me demander de modifier le ton ou les arguments avancés."
            )

        else:
            response_content = (
                f"Bonjour {user.first_name or user.username}. En tant que votre **Codex B2B**, je peux exécuter "
                f"instantanément vos tâches clés :\n\n"
                f"1. **« Analyse mon planning »** : Priorisation de vos visites et opportunités du jour.\n"
                f"2. **« Brief sur [Nom Entreprise] »** : Fiche complète de renseignements pré-visite.\n"
                f"3. **« Rédige un email de relance »** : Proposition commerciale sans jargon prête à l'envoi.\n"
                f"4. **« Évalue l'état BANT »** : Diagnostic de conversion de vos prospects assignés.\n\n"
                f"Comment puis-je vous assister maintenant ?"
            )

    # =========================================================================
    # 2. ACTIONS BACK-OFFICE : DIRECTIVES, DISPATCH & AUDIT TERRAIN
    # =========================================================================
    elif role == User.SUPERVISOR:
        # A. DISPATCH AUTOMATIQUE SUR UNE PLAQUE
        if any(w in lowered for w in ['dispatch', 'dispatcher', 'répartir', 'repartir', 'affecter', 'plaque']):
            action_type = 'AUTO_DISPATCH_PLAQUE'
            action_status = 'PROPOSED'

            # Détecter la plaque
            plaque = None
            for p in Plaque.objects.all():
                if p.name.lower() in lowered or p.code.lower() in lowered:
                    plaque = p
                    break
            if not plaque:
                plaque = Plaque.objects.first()

            if plaque:
                unassigned_count = Enterprise.objects.filter(plaque_rel=plaque.id, assigned_salesperson__isnull=True).count()
                salespersons = User.objects.filter(role=User.SALESPERSON, is_active=True)[:4]

                dispatch_plan = []
                if salespersons.exists() and unassigned_count > 0:
                    per_sp = max(1, unassigned_count // len(salespersons))
                    for sp in salespersons:
                        sp_name = f"{sp.first_name} {sp.last_name}".strip() or sp.username
                        dispatch_plan.append({
                            'salesperson_id': sp.id,
                            'name': sp_name,
                            'assigned_batch': per_sp
                        })

                action_result = {
                    'plaque_code': plaque.code,
                    'plaque_name': plaque.name,
                    'unassigned_enterprises': unassigned_count,
                    'available_salespersons': [f"{sp.first_name} {sp.last_name}".strip() or sp.username for sp in salespersons],
                    'dispatch_plan': dispatch_plan
                }

                response_content = (
                    f"**Proposition de Dispatch Automatique pour la Plaque {plaque.name} ({plaque.code})** :\n\n"
                    f"• **Entreprises en attente d'affectation :** {unassigned_count} comptes\n"
                    f"• **Commerciaux mobilisables :** {len(salespersons)} agents actifs\n\n"
                )
                if dispatch_plan:
                    response_content += "**Plan de répartition suggéré :**\n"
                    for dp in dispatch_plan:
                        response_content += f"• Affecter **{dp['assigned_batch']} entreprises** à **{dp['name']}**\n"
                    response_content += "\nConfirmez-vous l'application de ce dispatch terrain dans le système ?"
                else:
                    response_content += "Toutes les entreprises de cette plaque sont déjà affectées ou aucun commercial n'est disponible."
            else:
                response_content = "Veuillez spécifier la plaque géographique à dispatcher (ex: Gombe, Limete, etc.)."

        # B. RÉDACTION DE DIRECTIVE
        elif any(w in lowered for w in ['directive', 'instruction', 'ordre', 'ordre de mission', 'écris une directive', 'rédige']):
            action_type = 'DRAFT_DIRECTIVE'
            action_status = 'PROPOSED'

            target_sp = User.objects.filter(role=User.SALESPERSON).first()
            recipient_name = (f"{target_sp.first_name} {target_sp.last_name}".strip() or target_sp.username) if target_sp else "Équipe Commerciale Terrain"

            draft = {
                'target_entity': 'BACK_OFFICE',
                'recipient_id': target_sp.id if target_sp else None,
                'recipient_name': recipient_name,
                'title': "Priorité prospection : Entreprises non visitées de la plaque Gombe",
                'instruction': (
                    "Conformément aux objectifs hebdomadaires, concentrez vos tournées sur les entreprises non visitées "
                    "du secteur bancaire et tertiaire. Remplissez systématiquement la fiche d'investigation après chaque passage."
                ),
                'priority': 'HIGH',
                'target_account_name': "Plaque Gombe Sud"
            }

            action_result = draft
            response_content = (
                f"J'ai rédigé la directive suivante pour le Back-Office Terrain :\n\n"
                f"• **Destinataire :** {recipient_name}\n"
                f"• **Objet :** {draft['title']}\n"
                f"• **Priorité :** Urgente (HIGH)\n"
                f"• **Instructions :** {draft['instruction']}\n\n"
                f"Souhaitez-vous que je l'enregistre et la diffuse immédiatement au commercial ?"
            )

        else:
            response_content = (
                f"Bonjour {user.first_name or user.username}. En tant que votre **Copilote Back-Office**, je peux :\n\n"
                f"1. **« Dispatcher la plaque [Nom] »** : Répartir intelligemment les entreprises entre commerciaux.\n"
                f"2. **« Rédiger une directive »** : Transmettre une consigne opérationnelle formalisée.\n"
                f"3. **« Auditer la couverture terrain »** : Examiner les taux de visite et les plaques prioritaires.\n"
                f"4. **« Classement des commerciaux »** : Suivi des points d'incitation et des conversions.\n\n"
                f"Que souhaitez-vous lancer ?"
            )

    # =========================================================================
    # 3. ACTIONS KAM OFFICE (KAM_MANAGER)
    # =========================================================================
    elif role == User.KAM_MANAGER:
        if any(w in lowered for w in ['équilibre', 'equilibre', 'charge', 'répartition', 'repartition', 'portefeuille']):
            action_type = 'REBALANCE_PORTFOLIO'
            action_status = 'EXECUTED'

            kams = User.objects.filter(role=User.KAM, is_active=True)
            kam_stats = []
            for k in kams:
                gc_cnt = Enterprise.objects.filter(assigned_kam=k, segment='GRAND_COMPTE').count()
                pme_cnt = Enterprise.objects.filter(assigned_kam=k, segment='PME').count()
                kam_stats.append({
                    'kam_name': f"{k.first_name} {k.last_name}".strip() or k.username,
                    'specialization': k.kam_specialization or 'GRAND_COMPTE',
                    'grands_comptes': gc_cnt,
                    'pme': pme_cnt,
                    'total': gc_cnt + pme_cnt
                })

            action_result = {'kams_workload': kam_stats}

            response_content = (
                f"**Audit de charge des chargés d'affaires (KAM Office) :**\n\n"
            )
            for ks in kam_stats:
                response_content += (
                    f"• **{ks['kam_name']}** ({ks['specialization']}) : "
                    f"{ks['total']} comptes affectés ({ks['grands_comptes']} Grands Comptes, {ks['pme']} PME)\n"
                )
            response_content += "\n**Recommandation du Copilote :** La charge idéale est de 15 à 30 comptes par KAM. Aucun déséquilibre critique n'est constaté ce jour."

        else:
            response_content = (
                f"Bonjour {user.first_name or user.username}. En tant que votre **Copilote KAM Office**, "
                f"je vous aide à piloter le portefeuille stratégique :\n\n"
                f"• **« Équilibrer les portefeuilles KAM »** : Évaluation de la charge GC vs PME.\n"
                f"• **« Rédiger une directive aux KAMs »** : Transmission des priorités de closing.\n"
                f"• **« Synthèse du pipeline commercial »** : Point sur le CA en négociation.\n\n"
                f"Quelle action souhaitez-vous exécuter ?"
            )

    # =========================================================================
    # 4. ACTIONS SUPER ADMIN
    # =========================================================================
    else:
        response_content = (
            f"Bonjour {user.first_name or user.username}. En tant que votre **Copilote Super Administration**, "
            f"je peux auditer la segmentation globale de la base CRM, superviser les directives émises "
            f"et synthétiser les indicateurs de performance consolidés de l'ensemble de la plateforme."
        )

    # Persistance du message utilisateur et du message assistant
    user_msg = AIAssistantMessage.objects.create(
        conversation=conversation,
        role='user',
        content=clean_text
    )

    assistant_msg = AIAssistantMessage.objects.create(
        conversation=conversation,
        role='assistant',
        content=response_content,
        action_type=action_type,
        action_payload=action_payload,
        action_result=action_result,
        action_status=action_status
    )

    conversation.updated_at = timezone.now()
    conversation.save(update_fields=['updated_at'])

    return assistant_msg
