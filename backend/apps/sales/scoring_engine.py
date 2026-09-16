import os
from datetime import timedelta
from django.utils import timezone


class ScoringEngine:
    """
    Moteur de scoring déterministe et explicable (100% Python, sans IA/ML).
    Évalue les règles stockées en base de données contre les métriques d'un compte.
    """

    OPERATORS = {
        'equals': lambda actual, target: actual == target,
        'not_equals': lambda actual, target: actual != target,
        'greater_than': lambda actual, target: actual > target if isinstance(actual, (int, float)) and isinstance(target, (int, float)) else False,
        'greater_or_equal': lambda actual, target: actual >= target if isinstance(actual, (int, float)) and isinstance(target, (int, float)) else False,
        'less_than': lambda actual, target: actual < target if isinstance(actual, (int, float)) and isinstance(target, (int, float)) else False,
        'less_or_equal': lambda actual, target: actual <= target if isinstance(actual, (int, float)) and isinstance(target, (int, float)) else False,
        'is_true': lambda actual, _: bool(actual) is True,
        'is_false': lambda actual, _: bool(actual) is False,
        'is_set': lambda actual, _: actual is not None and actual != "" and actual != 0 and actual != [],
        'is_not_set': lambda actual, _: actual is None or actual == "" or actual == 0 or actual == [],
        'contains': lambda actual, target: str(target).lower() in str(actual).lower() if actual else False,
        'not_contains': lambda actual, target: str(target).lower() not in str(actual).lower() if actual else True,
    }

    @classmethod
    def evaluate_rule(cls, rule, metrics: dict) -> bool:
        field_name = rule.field
        actual_val = metrics.get(field_name)
        target_val = rule.value

        # Normalisation de la valeur cible si emballée dans un dict ou brute
        if isinstance(target_val, dict) and 'value' in target_val:
            target_val = target_val['value']

        op_func = cls.OPERATORS.get(rule.operator)
        if not op_func:
            return False

        try:
            return bool(op_func(actual_val, target_val))
        except Exception:
            return False

    @classmethod
    def calculate(cls, profile, metrics: dict) -> dict:
        """
        Calcule le score, la ventilation par dimension et la liste exacte des règles déclenchées.
        """
        score = profile.base_score
        triggered_rules = []
        
        # Dimensions configurées
        dimensions_list = profile.dimensions if isinstance(profile.dimensions, list) else []
        dimension_points = {d.get('name', 'general'): 0 for d in dimensions_list}

        rules = profile.rules.filter(is_active=True).order_by('order', 'id')
        for rule in rules:
            if cls.evaluate_rule(rule, metrics):
                score += rule.points
                dim = rule.dimension or 'general'
                dimension_points[dim] = dimension_points.get(dim, 0) + rule.points

                sign = "+" if rule.points > 0 else ""
                triggered_rules.append({
                    "id": rule.id,
                    "name": rule.name,
                    "dimension": rule.dimension,
                    "points": rule.points,
                    "points_formatted": f"{sign}{rule.points} pts",
                    "field": rule.field,
                    "value_observed": metrics.get(rule.field),
                })

        final_score = max(0, min(100, score))

        # Résolution du label et de la couleur selon les seuils configurés
        thresholds = profile.thresholds if isinstance(profile.thresholds, list) else []
        matched_status = "INDÉTERMINÉ"
        matched_color = "gray"
        triggered_action = ""

        for t in thresholds:
            t_min = t.get('min', 0)
            t_max = t.get('max', 100)
            if t_min <= final_score <= t_max:
                matched_status = t.get('label', 'Normal')
                matched_color = t.get('color', 'blue')
                break

        actions_config = profile.actions if isinstance(profile.actions, dict) else {}
        triggered_action = actions_config.get(matched_status, "")

        return {
            "score": final_score,
            "base_score": profile.base_score,
            "status_label": matched_status,
            "status_color": matched_color,
            "triggered_action": triggered_action,
            "triggered_rules": triggered_rules,
            "dimension_scores": dimension_points,
            "metrics_snapshot": metrics,
        }


class AccountMetricsExtractor:
    """
    Extrait les faits métier d'une entreprise (Enterprise) sous forme de dictionnaire de métriques normalisées.
    Conçu pour être 100% résilient, sans aucun plantage même si des relations ou champs sont nuls ou absents.
    """

    @staticmethod
    def extract_from_enterprise(enterprise, window_days: int = 90) -> dict:
        now = timezone.now()

        # 1. Réunions & Visites
        last_visited_at = getattr(enterprise, 'last_visited_at', None)
        days_since_last_meeting = (now - last_visited_at).days if last_visited_at else 999
        has_recent_report = (
            days_since_last_meeting <= 14 or
            (hasattr(enterprise, 'preparations') and enterprise.preparations.filter(created_at__gte=now - timedelta(days=14)).exists())
        )

        # 2. Opportunités & Conversion
        conversion_status = getattr(enterprise, 'conversion_status', '') or ''
        is_active_opp = conversion_status in ['IN_PROGRESS', 'READY_FOR_VALIDATION', 'CONTACTED', 'CONVERTED']
        quote_requested = conversion_status in ['READY_FOR_VALIDATION', 'CONVERTED'] or bool(getattr(enterprise, 'recommended_solution', ''))
        lost_opp_recently = conversion_status in ['ABANDONED', 'LOST', 'FAILED']

        # 3. Directives & Relances
        unanswered_followups = 0
        has_overdue_tasks = False
        if days_since_last_meeting > 60 and is_active_opp:
            has_overdue_tasks = True
            unanswered_followups = 2

        # 4. Contacts & Décideurs
        contact_name = getattr(enterprise, 'contact_name', '') or ''
        contact_role = (getattr(enterprise, 'contact_role', '') or '').upper()
        contact_phone = getattr(enterprise, 'contact_phone', '') or ''
        contact_email = getattr(enterprise, 'contact_email', '') or ''

        has_any_contact = bool(contact_name or contact_phone or contact_email)
        decision_maker_identified = any(role_kw in contact_role for role_kw in ['DG', 'DSI', 'DAF', 'DIR', 'CEO', 'CTO', 'GERANT', 'PRESIDENT', 'FONDATEUR', 'ADMINISTRATEUR'])
        champion_identified = bool(contact_name and contact_phone)
        multiple_active_contacts = bool(contact_name and contact_phone and contact_email)

        # 5. Signaux & Sentiments
        current_conn = (getattr(enterprise, 'current_connectivity', '') or '').lower()
        competitor_mentioned = any(c in current_conn for c in ['airtel', 'vodacom', 'africell', 'autre', 'fibre concurrent', 'starlink'])

        hypotheses_str = str(getattr(enterprise, 'ai_hypotheses', '') or '').lower()
        expansion_project = 'expansion' in hypotheses_str or 'croissance' in hypotheses_str or 'nouveau' in hypotheses_str
        site_count = getattr(enterprise, 'site_count', 1) or 1
        multisite_client = site_count > 1
        new_site_project_detected = expansion_project or multisite_client

        budget_monthly = float(getattr(enterprise, 'telecom_budget_monthly', 0) or 0)
        annual_rev = float(getattr(enterprise, 'annual_revenue', 0) or 0)
        budget_known = budget_monthly > 0 or annual_rev > 0

        incidents = getattr(enterprise, 'incident_count', 0) or 0
        pain_level = getattr(enterprise, 'pain_level', 'LOW') or 'LOW'
        positive_feedback = (conversion_status == 'CONVERTED') or (incidents == 0 and bool(getattr(enterprise, 'is_visited', False)))
        explicit_dissatisfaction = incidents > 3 or pain_level in ['HIGH', 'CRITICAL']
        complaint_noted = incidents > 1 or pain_level in ['MEDIUM', 'HIGH', 'CRITICAL']
        issue_resolved = incidents == 0 and bool(getattr(enterprise, 'is_visited', False))
        unresolved_issue_30d = incidents > 0 and days_since_last_meeting > 30

        explicit_need = bool(getattr(enterprise, 'recommended_solution', '')) or bool(pain_level in ['MEDIUM', 'HIGH'])

        return {
            "days_since_last_meeting": days_since_last_meeting,
            "future_meeting_next_14d": False,
            "recent_meeting_report_added": has_recent_report,
            "unanswered_followups": unanswered_followups,
            "has_overdue_tasks": has_overdue_tasks,
            "decision_maker_identified": decision_maker_identified,
            "champion_identified": champion_identified,
            "no_contacts_associated": not has_any_contact,
            "multiple_active_contacts": multiple_active_contacts,
            "no_decision_maker_interaction_90d": days_since_last_meeting > 90 and decision_maker_identified,
            "active_opportunity_recent_update": is_active_opp and days_since_last_meeting <= 30,
            "quote_requested": quote_requested,
            "explicit_need_detected": explicit_need,
            "competitor_mentioned": competitor_mentioned,
            "opportunity_lost_recently": lost_opp_recently,
            "opportunity_stale_60d": is_active_opp and days_since_last_meeting > 60,
            "expansion_project_mentioned": expansion_project,
            "new_site_project_detected": new_site_project_detected,
            "multisite_client": multisite_client,
            "budget_known": budget_known,
            "positive_feedback_detected": positive_feedback,
            "explicit_dissatisfaction": explicit_dissatisfaction,
            "complaint_noted": complaint_noted,
            "issue_resolved": issue_resolved,
            "unresolved_issue_30d": unresolved_issue_30d,
        }


def ensure_default_scoring_profiles():
    """
    Initialise les 2 profils standards préconfigurés (Santé et Upsell)
    conformément aux spécifications MSP Onbora.
    """
    from sales.models import ScoreProfile, ScoreRule

    # 1. SCORE SANTÉ RELATIONNELLE CLIENT (ACCOUNT_HEALTH)
    health_profile, created = ScoreProfile.objects.get_or_create(
        score_type=ScoreProfile.TYPE_HEALTH,
        defaults={
            "name": "Santé relationnelle client",
            "objective": "Détecter les comptes à risque de désengagement ou nécessitant une attention KAM",
            "population": "Tous les clients actifs",
            "analysis_window_days": 90,
            "recalculation_frequency": "Chaque nuit",
            "base_score": 100,
            "dimensions": [
                {"name": "engagement", "label": "Engagement client", "weight": 40},
                {"name": "relation", "label": "Relation commerciale", "weight": 25},
                {"name": "commercial", "label": "Situation commerciale", "weight": 25},
                {"name": "sentiment", "label": "Sentiment des échanges", "weight": 10},
            ],
            "thresholds": [
                {"min": 80, "max": 100, "label": "Sain", "color": "emerald"},
                {"min": 60, "max": 79, "label": "À suivre", "color": "blue"},
                {"min": 40, "max": 59, "label": "À surveiller", "color": "amber"},
                {"min": 0, "max": 39, "label": "Critique", "color": "rose"},
            ],
            "actions": {
                "Critique": "Créer une tâche KAM prioritaire sous 48h",
                "À surveiller": "Inscrire à la revue de compte hebdomadaire",
                "À suivre": "Planifier une visite de courtoisie",
                "Sain": "Aucune action corrective requise",
            },
            "is_active": True,
        }
    )

    if created or health_profile.rules.count() == 0:
        rules_data = [
            # Engagement
            ("Aucune réunion depuis plus de 60 jours", "engagement", "days_since_last_meeting", "greater_than", 60, -20, 1),
            ("Aucune réunion depuis plus de 90 jours", "engagement", "days_since_last_meeting", "greater_than", 90, -35, 2),
            ("Dernier contact il y a moins de 30 jours", "engagement", "days_since_last_meeting", "less_or_equal", 30, 15, 3),
            ("Plus de deux relances sans réponse", "engagement", "unanswered_followups", "greater_or_equal", 2, -15, 4),
            ("Tâche de suivi en retard", "engagement", "has_overdue_tasks", "is_true", True, -10, 5),
            ("Réunion planifiée dans les 14 prochains jours", "engagement", "future_meeting_next_14d", "is_true", True, 10, 6),
            ("Compte rendu ajouté récemment", "engagement", "recent_meeting_report_added", "is_true", True, 5, 7),
            # Relation
            ("Décideur identifié", "relation", "decision_maker_identified", "is_true", True, 15, 8),
            ("Champion ou contact principal identifié", "relation", "champion_identified", "is_true", True, 10, 9),
            ("Aucun contact associé au compte", "relation", "no_contacts_associated", "is_true", True, -20, 10),
            ("Plusieurs interlocuteurs actifs", "relation", "multiple_active_contacts", "is_true", True, 10, 11),
            ("Aucune interaction avec un décideur depuis 90 jours", "relation", "no_decision_maker_interaction_90d", "is_true", True, -15, 12),
            # Commercial
            ("Opportunité active mise à jour récemment", "commercial", "active_opportunity_recent_update", "is_true", True, 15, 13),
            ("Demande de devis identifiée", "commercial", "quote_requested", "is_true", True, 15, 14),
            ("Besoin explicite détecté en réunion", "commercial", "explicit_need_detected", "is_true", True, 15, 15),
            ("Concurrent explicitement mentionné", "commercial", "competitor_mentioned", "is_true", True, -20, 16),
            ("Opportunité perdue récemment", "commercial", "opportunity_lost_recently", "is_true", True, -20, 17),
            ("Opportunité sans mise à jour depuis 60 jours", "commercial", "opportunity_stale_60d", "is_true", True, -10, 18),
            ("Projet d’expansion mentionné", "commercial", "expansion_project_mentioned", "is_true", True, 10, 19),
            # Sentiment
            ("Satisfaction ou feedback positif détecté", "sentiment", "positive_feedback_detected", "is_true", True, 10, 20),
            ("Insatisfaction explicitement mentionnée", "sentiment", "explicit_dissatisfaction", "is_true", True, -15, 21),
            ("Plainte mentionnée dans une note", "sentiment", "complaint_noted", "is_true", True, -20, 22),
            ("Problème déclaré résolu", "sentiment", "issue_resolved", "is_true", True, 10, 23),
            ("Problème non résolu après 30 jours", "sentiment", "unresolved_issue_30d", "is_true", True, -20, 24),
        ]
        for name, dim, field, op, val, pts, order in rules_data:
            ScoreRule.objects.create(
                profile=health_profile,
                name=name,
                dimension=dim,
                field=field,
                operator=op,
                value={"value": val},
                points=pts,
                order=order,
            )

    # 2. SCORE POTENTIEL D'EXPANSION & UPSELL (EXPANSION_UPSELL)
    upsell_profile, created_up = ScoreProfile.objects.get_or_create(
        score_type=ScoreProfile.TYPE_UPSELL,
        defaults={
            "name": "Potentiel d'expansion B2B",
            "objective": "Identifier les opportunités de cross-sell, montée en débit, et nouveaux sites",
            "population": "Clients actifs",
            "analysis_window_days": 90,
            "recalculation_frequency": "Chaque nuit",
            "base_score": 0,
            "dimensions": [
                {"name": "commercial", "label": "Signaux commerciaux", "weight": 50},
                {"name": "relation", "label": "Solidité de relation", "weight": 30},
                {"name": "engagement", "label": "Dynamique d'échange", "weight": 20},
            ],
            "thresholds": [
                {"min": 80, "max": 100, "label": "Opportunité prioritaire", "color": "emerald"},
                {"min": 60, "max": 79, "label": "Opportunité à qualifier", "color": "blue"},
                {"min": 40, "max": 59, "label": "Signal à vérifier", "color": "amber"},
                {"min": 0, "max": 39, "label": "Aucun signal exploitable", "color": "gray"},
            ],
            "actions": {
                "Opportunité prioritaire": "Créer une opportunité CRM & planifier RDV sous 72h",
                "Opportunité à qualifier": "Assigner tâche de qualification au KAM",
                "Signal à vérifier": "Revue par le KAM lors du prochain point mensuel",
                "Aucun signal exploitable": "Veille passive",
            },
            "is_active": True,
        }
    )

    if created_up or upsell_profile.rules.count() == 0:
        upsell_rules_data = [
            ("Projet d’ouverture de site détecté", "commercial", "new_site_project_detected", "is_true", True, 25, 1),
            ("Besoin technique explicite en réunion", "commercial", "explicit_need_detected", "is_true", True, 25, 2),
            ("Demande de devis enregistrée", "commercial", "quote_requested", "is_true", True, 20, 3),
            ("Client multi-sites renseigné", "commercial", "multisite_client", "is_true", True, 10, 4),
            ("Décideur identifié", "relation", "decision_maker_identified", "is_true", True, 10, 5),
            ("Budget d'investissement connu", "relation", "budget_known", "is_true", True, 15, 6),
            ("Plusieurs interlocuteurs actifs", "relation", "multiple_active_contacts", "is_true", True, 10, 7),
            ("Dernier contact il y a moins de 30 jours", "engagement", "days_since_last_meeting", "less_or_equal", 30, 10, 8),
            ("Opportunité similaire perdue récemment", "commercial", "opportunity_lost_recently", "is_true", True, -15, 9),
            ("Concurrent dominant mentionné", "commercial", "competitor_mentioned", "is_true", True, -15, 10),
        ]
        for name, dim, field, op, val, pts, order in upsell_rules_data:
            ScoreRule.objects.create(
                profile=upsell_profile,
                name=name,
                dimension=dim,
                field=field,
                operator=op,
                value={"value": val},
                points=pts,
                order=order,
            )

    return health_profile, upsell_profile
