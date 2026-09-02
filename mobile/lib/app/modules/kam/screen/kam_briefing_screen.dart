import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/kam_briefing_controller.dart';
import '../model/kam_account_model.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';

class KamBriefingScreen extends StatelessWidget {
  const KamBriefingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.isRegistered<KamBriefingController>()
        ? Get.find<KamBriefingController>()
        : Get.put(KamBriefingController());
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppConstants.backgroundDark : AppConstants.backgroundLight,
      body: SafeArea(
        child: Column(
          children: [
            // 1. Barre Supérieure Monochrome
            _buildTopAppBar(context, controller, isDark),

            // 2. Segmented Control iOS (3 Onglets Digestes)
            _buildSegmentedTabSelector(controller, isDark),

            // 3. Corps de la vue sélectionnée
            Expanded(
              child: Obx(() {
                final briefing = controller.briefing.value;
                if (briefing == null) {
                  return Center(
                    child: CupertinoActivityIndicator(
                      color: isDark ? Colors.white : AppConstants.primaryBlack,
                    ),
                  );
                }

                return IndexedStack(
                  index: controller.selectedTab.value,
                  children: [
                    // Onglet 0 : ⚡ L'Essentiel (Flash 30s)
                    _buildTabEssential(briefing, isDark),

                    // Onglet 1 : 🏢 Contexte & SLA
                    _buildTabContextAndSla(briefing, isDark),

                    // Onglet 2 : 🎯 Plan de RDV & Playbook
                    _buildTabMeetingPlan(briefing, isDark),
                  ],
                );
              }),
            ),

            // 4. Barre d'action surélevée au-dessus de la TabBar flottante
            _buildBottomActionSheet(context, controller, isDark),
          ],
        ),
      ),
    );
  }

  // --- 1. Top App Bar Monochrome ---
  Widget _buildTopAppBar(BuildContext context, KamBriefingController controller, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
        border: Border(
          bottom: BorderSide(
            color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
            width: 1,
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Row(
              children: [
                ScaleTap(
                  onTap: () => Get.back(),
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      CupertinoIcons.chevron_back,
                      size: 20,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'BRIEFING PRÉ-VISITE',
                        style: AppConstants.overlineStyle(isDark).copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Obx(() => Text(
                            controller.briefing.value?.accountName.split('(').first.trim() ?? 'Compte',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: isDark ? Colors.white : AppConstants.textDark,
                            ),
                          )),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Badge de Statut Épuré
          Obx(() => Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: controller.isPrepared.value
                      ? const Color(0xFF10B981).withValues(alpha: 0.15)
                      : (isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7)),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: controller.isPrepared.value
                        ? const Color(0xFF10B981).withValues(alpha: 0.3)
                        : (isDark ? const Color(0x28FFFFFF) : const Color(0xFFE5E5EA)),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      controller.isPrepared.value
                          ? CupertinoIcons.checkmark_alt_circle_fill
                          : CupertinoIcons.doc_text_fill,
                      size: 13,
                      color: controller.isPrepared.value
                          ? const Color(0xFF10B981)
                          : (isDark ? Colors.white70 : AppConstants.textDark),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      controller.isPrepared.value ? 'Préparé' : 'Briefing Prêt',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: controller.isPrepared.value
                            ? const Color(0xFF10B981)
                            : (isDark ? Colors.white : AppConstants.textDark),
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  // --- 2. Segmented Tab Selector ---
  Widget _buildSegmentedTabSelector(KamBriefingController controller, bool isDark) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1C1E) : const Color(0xFFE5E5EA),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Obx(() {
        final activeTab = controller.selectedTab.value;
        return Row(
          children: [
            _buildTabButton(
              label: "⚡ L'Essentiel",
              index: 0,
              isSelected: activeTab == 0,
              onTap: () => controller.setTab(0),
              isDark: isDark,
            ),
            _buildTabButton(
              label: '🏢 Contexte',
              index: 1,
              isSelected: activeTab == 1,
              onTap: () => controller.setTab(1),
              isDark: isDark,
            ),
            _buildTabButton(
              label: '🎯 Plan RDV',
              index: 2,
              isSelected: activeTab == 2,
              onTap: () => controller.setTab(2),
              isDark: isDark,
            ),
          ],
        );
      }),
    );
  }

  Widget _buildTabButton({
    required String label,
    required int index,
    required bool isSelected,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return Expanded(
      child: ScaleTap(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeInOut,
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? Colors.white : AppConstants.primaryBlack)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    )
                  ]
                : null,
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
              color: isSelected
                  ? (isDark ? Colors.black : Colors.white)
                  : (isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280)),
            ),
          ),
        ),
      ),
    );
  }

  // --- ONGLET 0 : ⚡ L'ESSENTIEL (Flash 30s) ---
  Widget _buildTabEssential(dynamic briefing, bool isDark) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Rendez-vous contextuel
          _buildMeetingHeaderCard(briefing, isDark),

          const SizedBox(height: 14),

          // 🔴 LE PIÈGE À ÉVITER AUJOURD'HUI (Warning Callout)
          _buildTrapsCard(briefing, isDark),

          const SizedBox(height: 14),

          // 👥 LES DÉCIDEURS DANS LA SALLE
          _buildEssentialStakeholdersCard(briefing, isDark),

          const SizedBox(height: 14),

          // 💡 L'OPPORTUNITÉ ORANGE À PITCHER
          _buildOpportunityHighlightCard(briefing, isDark),

          const SizedBox(height: 100),
        ],
      ),
    );
  }

  // --- ONGLET 1 : 🏢 CONTEXTE & SANTÉ ORANGE ---
  Widget _buildTabContextAndSla(dynamic briefing, bool isDark) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Fiche d'identité entreprise
          _buildFirmographicsCard(briefing, isDark),

          const SizedBox(height: 14),

          // Contrats Orange & Disponibilité SLA
          _buildOrangeHealthCard(briefing, isDark),

          const SizedBox(height: 14),

          // Historique des interactions
          _buildInteractionsCard(briefing, isDark),

          const SizedBox(height: 100),
        ],
      ),
    );
  }

  // --- ONGLET 2 : 🎯 PLAN DE RDV & DÉROULÉ ---
  Widget _buildTabMeetingPlan(dynamic briefing, bool isDark) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Objectif de réunion & Agenda minuté
          _buildAgendaCard(briefing, isDark),

          const SizedBox(height: 14),

          // Hypothèses de douleur et arguments
          _buildPlaybookCard(briefing, isDark),

          const SizedBox(height: 100),
        ],
      ),
    );
  }

  // --- COMPOSANTS DE CARTES INDIVIDUELLES ---

  Widget _buildMeetingHeaderCard(dynamic briefing, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              CupertinoIcons.calendar_badge_plus,
              size: 20,
              color: isDark ? Colors.white : AppConstants.textDark,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${briefing.visitDate} • ${briefing.visitTime}',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  briefing.visitLocation,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrapsCard(dynamic briefing, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF241515) : const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFEF4444).withValues(alpha: isDark ? 0.4 : 0.2),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(CupertinoIcons.exclamationmark_triangle_fill, size: 16, color: Color(0xFFEF4444)),
              const SizedBox(width: 8),
              Text(
                'PIÈGE DU JOUR À ÉVITER',
                style: AppConstants.overlineStyle(isDark).copyWith(
                  color: const Color(0xFFEF4444),
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...briefing.trapsToAvoid.map<Widget>((trap) {
            return Text(
              trap,
              style: TextStyle(
                fontSize: 13,
                height: 1.4,
                fontWeight: FontWeight.w600,
                color: isDark ? const Color(0xFFFECACA) : const Color(0xFF991B1B),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildEssentialStakeholdersCard(dynamic briefing, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(CupertinoIcons.person_2_fill, size: 16, color: isDark ? Colors.white : AppConstants.textDark),
              const SizedBox(width: 8),
              Text(
                'LES DÉCIDEURS DANS LA SALLE',
                style: AppConstants.overlineStyle(isDark).copyWith(
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...briefing.meetingAttendees.map<Widget>((KamStakeholder person) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF242426) : const Color(0xFFF8F8FA),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark ? const Color(0x1AFFFFFF) : const Color(0xFFE5E5EA),
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF333336) : const Color(0xFFE5E5EA),
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      person.fullName.substring(0, 1),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          person.fullName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                        ),
                        Text(
                          person.jobTitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: person.stanceColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      person.roleDisplay,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: person.stanceColor,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildOpportunityHighlightCard(dynamic briefing, bool isDark) {
    final firstHypothesis = (briefing.painHypotheses as List).isNotEmpty ? briefing.painHypotheses.first : null;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(CupertinoIcons.lightbulb_fill, size: 16, color: Color(0xFFF59E0B)),
              const SizedBox(width: 8),
              Text(
                'SOLUTION À PROPOSER (OFFRE ORANGE)',
                style: AppConstants.overlineStyle(isDark).copyWith(
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            firstHypothesis?.orangeOpportunity ?? 'Liaison Fibre Dédiée Sécurisée & Redondance 5G',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              height: 1.35,
              color: isDark ? Colors.white : AppConstants.textDark,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'En réponse à : ${firstHypothesis?.title ?? "Besoin de continuité de service 99.99%"}.',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFirmographicsCard(dynamic briefing, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ACTIVITÉ & STRUCTURATION',
            style: AppConstants.overlineStyle(isDark).copyWith(
              fontWeight: FontWeight.w700,
              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Première institution bancaire privée en RDC. Déploiement accéléré des agences digitales, monétique mobile et besoin critique de continuité 99.99%.',
            style: TextStyle(
              fontSize: 13.5,
              height: 1.4,
              color: isDark ? Colors.white : AppConstants.textDark,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildTag('2 400 employés', isDark),
              _buildTag('110 sites / agences', isDark),
              _buildTag('Croissance Digitale', isDark),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTag(String text, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF242426) : const Color(0xFFF2F2F7),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark ? const Color(0x1AFFFFFF) : const Color(0xFFE5E5EA),
          width: 1,
        ),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w600,
          color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF4B5563),
        ),
      ),
    );
  }

  Widget _buildOrangeHealthCard(dynamic briefing, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'CONTRATS ORANGE ACTIFS',
                style: AppConstants.overlineStyle(isDark).copyWith(
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'Renouvellement 60j',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFFF59E0B)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...briefing.currentOrangeServices.map<Widget>((contract) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF242426) : const Color(0xFFF8F8FA),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isDark ? const Color(0x1AFFFFFF) : const Color(0xFFE5E5EA),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            contract.serviceName,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: isDark ? Colors.white : AppConstants.textDark,
                            ),
                          ),
                          Text(
                            'Échéance : ${contract.endDate} • SLA ${contract.slaStatus}',
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      contract.monthlyRevenue,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildInteractionsCard(dynamic briefing, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'DERNIÈRES INTERACTIONS',
            style: AppConstants.overlineStyle(isDark).copyWith(
              fontWeight: FontWeight.w700,
              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 10),
          ...briefing.lastInteractions.map<Widget>((interaction) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 6.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    margin: const EdgeInsets.only(top: 6, right: 8),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isDark ? Colors.white60 : AppConstants.textDark,
                    ),
                  ),
                  Expanded(
                    child: Text(
                      interaction,
                      style: TextStyle(
                        fontSize: 12.5,
                        height: 1.35,
                        color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF4B5563),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildAgendaCard(dynamic briefing, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'DÉROULÉ RECOMMANDÉ (45 MIN)',
            style: AppConstants.overlineStyle(isDark).copyWith(
              fontWeight: FontWeight.w700,
              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 10),
          ...briefing.suggestedAgenda.map<Widget>((item) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Text(
                item,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildPlaybookCard(dynamic briefing, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'HYPOTHÈSES DE DOULEUR & QUESTIONS',
            style: AppConstants.overlineStyle(isDark).copyWith(
              fontWeight: FontWeight.w700,
              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 10),
          ...briefing.painHypotheses.map<Widget>((hypothesis) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 10.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    hypothesis.title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Preuve : ${hypothesis.contextEvidence}',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  // --- 4. Barre d'Action Fixe Inférieure Monochrome Haute Visibilité ---
  Widget _buildBottomActionSheet(BuildContext context, KamBriefingController controller, bool isDark) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 92),
      decoration: BoxDecoration(
        color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
        border: Border(
          top: BorderSide(
            color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: ScaleTap(
              onTap: () => controller.markBriefingAsPrepared(),
              child: Container(
                height: 50,
                decoration: BoxDecoration(
                  color: AppConstants.secondaryBtnColor(isDark),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: AppConstants.secondaryBtnBorderColor(isDark),
                    width: 1,
                  ),
                ),
                alignment: Alignment.center,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(CupertinoIcons.checkmark_seal_fill, size: 16, color: Color(0xFF10B981)),
                    const SizedBox(width: 8),
                    Text(
                      'Valider',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppConstants.secondaryBtnTextColor(isDark),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 2,
            child: ScaleTap(
              onTap: () => controller.startStrategicMeeting(),
              child: Container(
                height: 50,
                decoration: BoxDecoration(
                  color: AppConstants.primaryBtnColor(isDark),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.15),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                alignment: Alignment.center,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      CupertinoIcons.waveform_circle_fill,
                      size: 20,
                      color: AppConstants.primaryBtnTextColor(isDark),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Démarrer Débrief',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppConstants.primaryBtnTextColor(isDark),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
