import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../common/constants/app_constants.dart';
import '../../../../common/screen/widget/skeleton_loader.dart';
import '../../data/kam_repository.dart';

class KamAsyncView extends StatefulWidget {
  final Future<dynamic> Function() load;
  final Widget Function(dynamic data) builder;
  const KamAsyncView({super.key, required this.load, required this.builder});
  @override
  State<KamAsyncView> createState() => KamAsyncViewState();
}

class KamAsyncViewState extends State<KamAsyncView> {
  dynamic _data;
  bool _loading = true;
  bool _failed = false;
  int _request = 0;
  @override
  void initState() {
    super.initState();
    reload();
  }

  Future<void> reload() async {
    final request = ++_request;
    setState(() {
      _loading = true;
      _failed = false;
    });
    try {
      final data = await widget.load();
      if (mounted && request == _request) setState(() => _data = data);
    } catch (_) {
      if (mounted && request == _request) setState(() => _failed = true);
    } finally {
      if (mounted && request == _request) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          children: [SkeletonCard(), SkeletonCard(), SkeletonCard()],
        ),
      );
    }
    if (_failed) {
      return KamEmpty(
        icon: Icons.cloud_off_outlined,
        text:
            'Impossible de charger ces données. Vérifiez votre connexion et réessayez.',
        action: 'Réessayer',
        onAction: reload,
      );
    }
    return RefreshIndicator(onRefresh: reload, child: widget.builder(_data));
  }
}

class KamEmpty extends StatelessWidget {
  final IconData icon;
  final String text;
  final String action;
  final VoidCallback onAction;
  const KamEmpty({
    super.key,
    this.icon = Icons.inbox_outlined,
    required this.text,
    required this.action,
    required this.onAction,
  });
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 34),
          const SizedBox(height: 16),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, height: 1.618),
          ),
          const SizedBox(height: 16),
          TextButton(onPressed: onAction, child: Text(action)),
        ],
      ),
    ),
  );
}

class KamSurface extends StatelessWidget {
  final Widget child;
  const KamSurface({super.key, required this.child});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Material(
      color: Theme.of(context).brightness == Brightness.dark
          ? AppConstants.cardDark
          : AppConstants.cardLight,
      borderRadius: BorderRadius.circular(24),
      clipBehavior: Clip.antiAlias,
      child: Padding(padding: const EdgeInsets.all(16), child: child),
    ),
  );
}

String kamText(dynamic value) {
  if (value == null || value == '') return 'Non renseigné';
  if (value is bool) return value ? 'Oui' : 'Non';
  if (value is String && RegExp(r'^\d{4}-\d{2}-\d{2}(T|$)').hasMatch(value)) {
    final date = DateTime.tryParse(value)?.toLocal();
    if (date != null) {
      return DateFormat(
        value.contains('T') ? "dd/MM/yyyy 'à' HH:mm" : 'dd/MM/yyyy',
      ).format(date);
    }
  }
  return _values[value.toString()] ?? value.toString();
}

const _values = {
  'SCHEDULED': 'Planifié',
  'COMPLETED': 'Effectué',
  'CANCELLED': 'Annulé',
  'PROSPECT': 'Prospect',
  'IN_NEGOTIATION': 'En négociation',
  'CONVERTED': 'Contrat signé',
  'LOST': 'Perdu',
  'PHYSICAL': 'Présentiel',
  'GOOGLE_MEET': 'Google Meet',
  'CALL': 'Appel',
  'HIGH': 'Élevé',
  'MEDIUM': 'Moyen',
  'LOW': 'Faible',
  'CRITICAL': 'Critique',
  'STRONG': 'Signal fort',
  'WEAK': 'Signal faible',
  'PENDING': 'À faire',
  'IN_PROGRESS': 'En cours',
  'DONE': 'Terminé',
  'OVERDUE': 'En retard',
  'POSITIVE': 'Favorable',
  'NEUTRAL': 'Neutre',
  'NEGATIVE': 'Défavorable',
  'ECONOMIC_BUYER': 'Décideur économique',
  'CHAMPION': 'Allié interne',
  'TECHNICAL_BUYER': 'Décideur technique',
  'USER': 'Utilisateur',
  'INFLUENCER': 'Prescripteur',
  'GATEKEEPER': 'Intermédiaire',
  'BLOCKER': 'Opposant',
  'UNKNOWN': 'Non renseigné',
  'HEALTHY': 'Conforme',
  'WARNING': 'À surveiller',
  'BREACHED': 'Engagement non respecté',
  'NON_CLIENT': 'Prospect',
  'PARTIAL_CLIENT': 'Client partiel',
  'MULTI_PRODUCT_CLIENT': 'Client multi-offres',
  'CHURN_RISK': 'Risque de départ',
};

/// Explicit presentation schema: never displays arbitrary API keys or metadata.
const kamLabels = <String, String>{
  'account_name': 'Entreprise',
  'enterprise_name': 'Entreprise',
  'name': 'Nom',
  'title': 'Objet',
  'summary': 'Synthèse',
  'executive_summary': 'Synthèse exécutive',
  'company_overview': 'Présentation',
  'business_model_summary': 'Activité',
  'firmographics': 'Entreprise',
  'industry': 'Secteur',
  'sector': 'Secteur',
  'headcount': 'Effectif',
  'locations_count': 'Sites',
  'countries': 'Pays',
  'estimated_annual_revenue': 'Chiffre d’affaires estimé',
  'orange_relationship': 'Relation Orange',
  'client_status': 'Statut client',
  'mrr_current': 'Revenu mensuel',
  'wallet_share_percentage': 'Part de portefeuille (%)',
  'active_contracts': 'Contrats actifs',
  'service_name': 'Service',
  'monthly_value': 'Montant mensuel',
  'end_date': 'Échéance',
  'sla_status': 'Qualité de service',
  'critical_incidents_summary': 'Incidents',
  'last_interactions_summary': 'Derniers échanges',
  'open_commitments': 'Engagements ouverts',
  'stakeholders_mapping': 'Décideurs',
  'full_name': 'Nom',
  'job_title': 'Fonction',
  'role_in_decision': 'Rôle de décision',
  'influence_level': 'Influence',
  'stance_towards_orange': 'Position',
  'key_notes': 'Notes',
  'missing_stakeholders_alert': 'Contacts à identifier',
  'trigger_signals': 'Signaux d’affaires',
  'description': 'Description',
  'source': 'Source',
  'date': 'Date',
  'technical_environment': 'Environnement technique',
  'current_competitors': 'Opérateurs actuels',
  'installed_cloud_telecom_stack': 'Parc installé',
  'known_constraints': 'Contraintes',
  'cybersecurity_compliance_needs': 'Sécurité et conformité',
  'ai_hypotheses_and_playbook': 'Pistes commerciales',
  'pain_hypotheses': 'Besoins anticipés',
  'hypothesis': 'Hypothèse',
  'trigger_evidence': 'Éléments observés',
  'discovery_angle': 'Angle de découverte',
  'orange_opportunities': 'Opportunités',
  'solution_category': 'Solution',
  'value_proposition': 'Valeur proposée',
  'potential_mrr': 'Potentiel mensuel',
  'visit_strategy': 'Stratégie de visite',
  'primary_objective': 'Objectif',
  'ideal_outcome': 'Résultat attendu',
  'suggested_agenda': 'Déroulé suggéré',
  'traps_to_avoid': 'Points de vigilance',
  'key_decision_makers': 'Décideurs clés',
  'detected_business_challenges': 'Enjeux métier',
  'custom_pitch_angles': 'Arguments',
  'critical_discovery_questions': 'Questions de découverte',
  'golden_rules': 'Points de vigilance',
  'real_needs': 'Besoins réels confirmés',
  'predicted_needs': 'Besoins anticipés',
  'confirmed_needs': 'Besoins confirmés',
  'objections_raised': 'Objections',
  'actions_todo': 'Actions à mener',
  'follow_up_email_draft': 'Email de suivi',
  'client_followup_email': 'Email de suivi',
  'subject': 'Objet',
  'body': 'Message',
  'commitments_extracted': 'Engagements',
  'action': 'Action',
  'owner': 'Responsable',
  'due_date': 'Échéance',
  'status': 'Statut',
  'risk_level': 'Niveau de risque',
  'next_step_recommendation': 'Prochaine étape',
  'conversion_status': 'Statut commercial',
  'bant_scores': 'Qualification BANT',
  'budget': 'Budget',
  'authority': 'Autorité',
  'need': 'Besoin',
  'timeline': 'Échéance',
  'total': 'Score total',
  'score': 'Score',
  'analysis': 'Analyse',
  'health_score': 'Santé du compte',
  'churn_risk_score': 'Risque de départ',
  'risk_factors': 'Facteurs de risque',
  'recommended_actions': 'Actions recommandées',
  'reason': 'Motif',
  'label': 'Indicateur',
  'value': 'Valeur',
  'commercial_angle': 'Angle commercial',
  'recommended_action': 'Action recommandée',
  'recommended_offer': 'Offre recommandée',
  'signal_rationale': 'Pourquoi ce signal',
  'signal_strength_display': 'Force du signal',
  'category_display': 'Catégorie',
  'source_name': 'Source',
  'published_at': 'Publication',
  'installed_offers': 'Parc installé',
  'installed_offer_name': 'Offre',
  'provider_label': 'Opérateur',
  'contract_status_label': 'Statut du contrat',
  'contract_end_date': 'Fin de contrat',
  'monthly_cost_mrr': 'Coût mensuel',
  'bandwidth_mbps': 'Débit (Mbps)',
  'active_licenses_count': 'Licences actives',
  'unresolved_tickets_count': 'Incidents ouverts',
  'technical_equipment': 'Équipement',
  'objective': 'Objectif',
  'contact_name': 'Contact',
  'contact_role': 'Fonction',
  'location': 'Lieu',
  'meeting_type_label': 'Format',
  'scheduled_at': 'Date du rendez-vous',
  'duration_minutes': 'Durée (minutes)',
  'visit_purpose_label': 'Type de visite',
  'purpose_reason': 'Motif proposé',
  'status_label': 'Statut',
  'recommended_packages': 'Offres recommandées',
  'price_range': 'Budget estimé',
  'match_reason': 'Pertinence',
  'next_steps': 'Prochaines étapes',
  'briefing': 'Briefing du compte',
  'results': 'Actualités',
  'account_facts': 'Informations du compte',
  'visit_facts': 'Historique connu',
  'questions_to_confirm': 'Questions à confirmer',
  'ai_summary': 'Synthèse',
  'overview': 'Vue d’ensemble',
  'text': 'Information',
  'key_facts': 'Faits clés',
  'contradictions': 'Points de vigilance',
  'gaps': 'Informations à compléter',
  'recommended_solutions': 'Solutions recommandées',
  'sla': 'Engagement de service',
  'rdc_availability': 'Disponibilité en RDC',
  'evidence': 'Éléments vérifiés',
  'sources': 'Sources',
  'publisher': 'Publication',
  'url': 'Lien',
  'relevant_excerpt': 'Extrait pertinent',
  'reasons': 'Justification',
  'company': 'Identité de l’entreprise',
  'legal_name': 'Raison sociale',
  'trade_name': 'Nom commercial',
  'rccm': 'RCCM',
  'province': 'Province',
  'lead_qualification': 'Qualification',
  'journeys': 'Parcours recommandés',
  'offers': 'Offres',
  'target_solution': 'Solution cible',
  'angle_title': 'Argument',
  'business_impact': 'Impact métier',
  'recommended_package': 'Offre recommandée',
  'lead_score': 'Score commercial',
  'score_drivers': 'Facteurs du score',
  'factor': 'Facteur',
  'points': 'Points',
  'recommended_approach': 'Approche recommandée',
  'estimated_mrr_usd': 'Revenu mensuel estimé (USD)',
  'conversion_probability': 'Probabilité de conversion',
  'healthScore': 'Santé du compte',
  'criticalSignals': 'Signaux critiques',
  'riskLevel': 'Niveau de risque',
  'lastInteraction': 'Dernier échange',
  'renewalTimeline': 'Prochain renouvellement',
  'renewalDate': 'Date du renouvellement',
  'daysRemaining': 'Jours restants',
  'activeService': 'Service actif',
  'monthlyRevenue': 'Revenu mensuel',
  'daysWithoutAction': 'Jours sans action',
  'enterprise': 'Entreprise',
  'deployment_overview': 'Déploiement',
  'access_constraints': 'Contraintes d’accès',
  'current_operator': 'Opérateur actuel',
  'solutions': 'Solutions',
  'speed': 'Débit',
  'role': 'Rôle',
  'equipment_list': 'Équipements',
  'item': 'Équipement',
  'quantity': 'Quantité',
  'specs': 'Spécifications',
  'network_configuration': 'Configuration réseau',
  'wan': 'Réseau étendu',
  'ip_address': 'Adresse IP',
  'gateway': 'Passerelle',
  'netmask': 'Masque réseau',
  'dns_primary': 'DNS principal',
  'dns_secondary': 'DNS secondaire',
  'lan_vlans': 'Réseaux locaux',
  'vlan_id': 'VLAN',
  'subnet': 'Sous-réseau',
  'dhcp_range': 'Plage DHCP',
  'acceptance_checklist': 'Vérifications de réception',
  'step': 'Étape',
  'expected': 'Résultat attendu',
  'validation': 'Validation',
  'technician_notes': 'Notes pour le technicien',
  'reference': 'Référence',
  'risk_reasons': 'Facteurs de risque',
  'retention_plan': 'Plan de fidélisation',
  'upsell_opportunities': 'Opportunités de développement',
  'days_without_action': 'Jours sans action',
  'renewal_days': 'Jours avant renouvellement',
  'next_action_at': 'Prochaine action',
  'last_action_at': 'Dernière action',
  'budget_range': 'Budget envisagé',
  'budget_notes': 'Précisions budgétaires',
  'timeline_notes': 'Précisions du calendrier',
  'signature_timeline': 'Échéance de signature',
  'identified_decision_makers': 'Décideurs identifiés',
  'confirmed_business_needs': 'Besoins métier confirmés',
  'authority_notes': 'Circuit de décision',
  'health_reason': 'Diagnostic',
  'opportunity': 'Opportunité',
  'pitch': 'Argument commercial',
  'target_offer': 'Offre cible',
  'recommendedOffer': 'Offre recommandée',
  'opportunityType': 'Type d’opportunité',
  'commercialPitch': 'Argument commercial',
  'potentialRevenue': 'Revenu potentiel',
  'daysInactive': 'Jours sans action',
  'recommendedSolution': 'Solution recommandée',
  'estimatedPotential': 'Potentiel estimé',
  'strategicAngle': 'Argument commercial',
  'recommendedAction': 'Action recommandée',
  'lastContactDate': 'Dernier contact',
  'keyStakeholder': 'Interlocuteur clé',
};

class KamDocument extends StatelessWidget {
  final dynamic data;
  const KamDocument({super.key, required this.data});
  @override
  Widget build(BuildContext context) {
    if (data is List) {
      if ((data as List).isEmpty) return const Text('Aucun élément renseigné.');
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final item in data as List)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: KamDocument(data: item),
            ),
        ],
      );
    }
    if (data is Map) {
      final fields = KamRepository.record(data).entries
          .where(
            (e) =>
                kamLabels.containsKey(e.key) &&
                e.value != null &&
                e.value != '' &&
                !(e.value is List && (e.value as List).isEmpty),
          )
          .toList();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final field in fields)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    kamLabels[field.key]!,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (field.key == 'url')
                    TextButton.icon(
                      icon: const Icon(Icons.open_in_new),
                      label: Text(kamText(field.value)),
                      onPressed: () async {
                        final uri = Uri.tryParse(field.value.toString());
                        if (uri == null ||
                            !['http', 'https'].contains(uri.scheme)) {
                          return;
                        }
                        try {
                          if (!await launchUrl(
                            uri,
                            mode: LaunchMode.externalApplication,
                          )) {
                            throw const FormatException();
                          }
                        } catch (_) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Ce lien est indisponible.'),
                              ),
                            );
                          }
                        }
                      },
                    )
                  else
                    KamDocument(data: field.value),
                ],
              ),
            ),
          if (fields.isEmpty)
            const Text('Aucune information disponible pour le moment.'),
        ],
      );
    }
    return SelectableText(
      kamText(data),
      style: const TextStyle(fontSize: 16, height: 1.618),
    );
  }
}
