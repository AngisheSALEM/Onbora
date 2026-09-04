import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../controller/kam_controller.dart';
import '../../../../common/constants/app_constants.dart';
import '../../../../common/screen/widget/scale_tap.dart';
import '../../../../routes/app_routes.dart';

/// Modales et Panneaux Associés à la ToolBar Exécutive KAM (SF Pro & Apple Dark Surfaces)
class KamToolbarModals {
  /// 1. Centre de Notifications et Alertes SLA
  static void showNotifications(BuildContext context, {required bool isDark, required KamController controller}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.70,
          decoration: BoxDecoration(
            color: isDark ? AppConstants.cardDark : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.35),
                blurRadius: 24,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Column(
            children: [
              // Drag Handle
              Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.black12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(
                          CupertinoIcons.bell_fill,
                          color: isDark ? Colors.white : AppConstants.textDark,
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Alertes & Notifications',
                          style: TextStyle(
                            fontFamily: AppConstants.fontFamilyPrimary,
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                            letterSpacing: -0.2,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                        ),
                      ],
                    ),
                    ScaleTap(
                      onTap: () => Navigator.pop(ctx),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: isDark ? AppConstants.subcardDark : AppConstants.subcardLight,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          CupertinoIcons.xmark,
                          size: 14,
                          color: isDark ? Colors.white70 : Colors.black54,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Divider(
                height: 1,
                color: isDark ? AppConstants.dividerDark : AppConstants.dividerLight,
              ),

              // Liste des alertes
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  physics: const BouncingScrollPhysics(),
                  children: [
                    _buildAlertItem(
                      icon: CupertinoIcons.exclamationmark_triangle_fill,
                      iconColor: AppConstants.accentRed,
                      title: 'Incident SLA - Rawbank Kinshasa',
                      description: 'Micro-coupure résolue sur le lien Siège 100 Mbps. Rapport technique transmis au DSI.',
                      time: 'Il y a 25 min',
                      isDark: isDark,
                    ),
                    const SizedBox(height: 10),
                    _buildAlertItem(
                      icon: CupertinoIcons.clock_fill,
                      iconColor: AppConstants.accentAmber,
                      title: 'Renouvellement Contrat (60 jours)',
                      description: 'Contrat Fibre Dédiée Rawbank expire le 15/10/2026. Lancer l\'avenant de renouvellement.',
                      time: 'Aujourd\'hui',
                      isDark: isDark,
                    ),
                    const SizedBox(height: 10),
                    _buildAlertItem(
                      icon: CupertinoIcons.sparkles,
                      iconColor: AppConstants.primaryBlue,
                      title: 'Synthèse Pré-Visite IA disponible',
                      description: 'Le briefing 360° pour le rendez-vous BGFIBank de 14h30 est prêt pour consultation.',
                      time: 'Hier',
                      isDark: isDark,
                    ),
                    const SizedBox(height: 10),
                    _buildAlertItem(
                      icon: CupertinoIcons.person_2_fill,
                      iconColor: AppConstants.accentGreen,
                      title: 'Mouvement Décideur Détecté',
                      description: 'Nomination d\'un nouveau Responsable Infrastructure IT chez Telecel RDC.',
                      time: '02 Sept.',
                      isDark: isDark,
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  static Widget _buildAlertItem({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String description,
    required String time,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppConstants.subcardDark : AppConstants.subcardLight,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 16, color: iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: AppConstants.fontFamilyPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -0.2,
                          color: isDark ? Colors.white : AppConstants.textDark,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      time,
                      style: TextStyle(
                        fontFamily: AppConstants.fontFamilyPrimary,
                        fontSize: 11,
                        fontWeight: FontWeight.w400,
                        color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(
                    fontFamily: AppConstants.fontFamilyPrimary,
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    height: 1.35,
                    color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// 2. Synthèse Exécutive IA du Portefeuille (Executive AI Summary)
  static void showExecutiveSummary(BuildContext context, {required bool isDark, required KamController controller}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.75,
          decoration: BoxDecoration(
            color: isDark ? AppConstants.cardDark : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.35),
                blurRadius: 24,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Column(
            children: [
              Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.black12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(
                          CupertinoIcons.sparkles,
                          color: isDark ? Colors.white : AppConstants.textDark,
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Synthèse Portefeuille IA',
                          style: TextStyle(
                            fontFamily: AppConstants.fontFamilyPrimary,
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                            letterSpacing: -0.2,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                        ),
                      ],
                    ),
                    ScaleTap(
                      onTap: () => Navigator.pop(ctx),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: isDark ? AppConstants.subcardDark : AppConstants.subcardLight,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          CupertinoIcons.xmark,
                          size: 14,
                          color: isDark ? Colors.white70 : Colors.black54,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Divider(
                height: 1,
                color: isDark ? AppConstants.dividerDark : AppConstants.dividerLight,
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  physics: const BouncingScrollPhysics(),
                  children: [
                    // Chiffres Clés Exécutifs
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'SITUATION GLOBALE PORTEFEUILLE',
                          style: TextStyle(
                            fontFamily: AppConstants.fontFamilyPrimary,
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 0.4,
                            color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '142 500 \$ / mois',
                          style: TextStyle(
                            fontFamily: AppConstants.fontFamilyPrimary,
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.3,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Portefeuille de 4 comptes majeurs. Croissance mensuelle stable (+4.2%). Taux de pénétration Orange moyen : 58%.',
                          style: TextStyle(
                            fontFamily: AppConstants.fontFamilyPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.w400,
                            height: 1.4,
                            color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // Opportunités & Recommandations IA
                    Text(
                      'Recommandations Prioritaires IA',
                      style: TextStyle(
                        fontFamily: AppConstants.fontFamilyPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -0.2,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildSummaryItem(
                      icon: CupertinoIcons.arrow_up_right_circle_fill,
                      iconColor: AppConstants.accentGreen,
                      title: 'Potentiel d\'Upsell SD-WAN (+45k\$ MRR)',
                      body: 'Rawbank et Vodacom ont exprimé un besoin de simplification réseau sur leurs agences provinciales.',
                      isDark: isDark,
                    ),
                    const SizedBox(height: 12),
                    _buildSummaryItem(
                      icon: CupertinoIcons.shield_lefthalf_fill,
                      iconColor: AppConstants.accentAmber,
                      title: 'Sécurisation Contrat Fibre (Rawbank)',
                      body: 'Renouvellement stratégique sous 60j. Risque d\'alignement tarifaire demandé par la Directrice des Achats.',
                      isDark: isDark,
                    ),
                    const SizedBox(height: 24),

                    // Bouton Export PDF
                    ScaleTap(
                      onTap: () {
                        Navigator.pop(ctx);
                        Get.snackbar(
                          'Export Rapport',
                          'Rapport exécutif généré avec succès au format PDF.',
                          snackPosition: SnackPosition.BOTTOM,
                          backgroundColor: isDark ? AppConstants.subcardDark : Colors.black87,
                          colorText: Colors.white,
                          icon: const Icon(CupertinoIcons.doc_text_fill, color: Colors.white, size: 20),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: AppConstants.accentBlue,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: AppConstants.accentBlue.withValues(alpha: 0.35),
                              blurRadius: 10,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        alignment: Alignment.center,
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              CupertinoIcons.share,
                              size: 16,
                              color: Colors.white,
                            ),
                            SizedBox(width: 8),
                            Text(
                              'Exporter le Rapport Exécutif PDF',
                              style: TextStyle(
                                fontFamily: AppConstants.fontFamilyPrimary,
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  static Widget _buildSummaryItem({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String body,
    required bool isDark,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: iconColor),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontFamily: AppConstants.fontFamilyPrimary,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                body,
                style: TextStyle(
                  fontFamily: AppConstants.fontFamilyPrimary,
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                  height: 1.35,
                  color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// 3. Actions Rapides KAM (Quick Action Menu)
  static void showQuickActions(BuildContext context, {required bool isDark, required KamController controller}) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          decoration: BoxDecoration(
            color: isDark ? AppConstants.cardDark : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white24 : Colors.black12,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Text(
                  'Actions Rapides',
                  style: TextStyle(
                    fontFamily: AppConstants.fontFamilyPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.2,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
                const SizedBox(height: 16),
                _buildQuickActionTile(
                  icon: CupertinoIcons.waveform,
                  iconColor: AppConstants.primaryBlue,
                  title: 'Nouveau Débriefing Vocal IA',
                  subtitle: 'Enregistrer une note vocale à la sortie d\'une réunion',
                  onTap: () {
                    Navigator.pop(ctx);
                    Get.toNamed(Routes.KAM_DEBRIEF);
                  },
                  isDark: isDark,
                ),
                const SizedBox(height: 10),
                _buildQuickActionTile(
                  icon: CupertinoIcons.calendar_badge_plus,
                  iconColor: AppConstants.accentGreen,
                  title: 'Programmer un Rendez-vous VIP / COPIL',
                  subtitle: 'Fixer une date de revue stratégique ou de négociation',
                  onTap: () {
                    Navigator.pop(ctx);
                    Get.snackbar(
                      'Agenda VIP',
                      'Formulaire de planification de réunion ouvert.',
                      snackPosition: SnackPosition.BOTTOM,
                      backgroundColor: isDark ? AppConstants.subcardDark : Colors.black87,
                      colorText: Colors.white,
                      icon: const Icon(CupertinoIcons.calendar, color: Colors.white, size: 20),
                    );
                  },
                  isDark: isDark,
                ),
                const SizedBox(height: 10),
                _buildQuickActionTile(
                  icon: CupertinoIcons.person_crop_circle_badge_plus,
                  iconColor: AppConstants.accentAmber,
                  title: 'Ajouter un Contact Clé / Décideur',
                  subtitle: 'Enregistrer un nouveau DSI, Acheteur ou Champion',
                  onTap: () {
                    Navigator.pop(ctx);
                    Get.snackbar(
                      'Organigramme',
                      'Ajout de partie prenante sur le compte sélectionné.',
                      snackPosition: SnackPosition.BOTTOM,
                      backgroundColor: isDark ? AppConstants.subcardDark : Colors.black87,
                      colorText: Colors.white,
                      icon: const Icon(CupertinoIcons.person_add, color: Colors.white, size: 20),
                    );
                  },
                  isDark: isDark,
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
        );
      },
    );
  }

  static Widget _buildQuickActionTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return ScaleTap(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? AppConstants.subcardDark : AppConstants.subcardLight,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, size: 20, color: iconColor),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontFamily: AppConstants.fontFamilyPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontFamily: AppConstants.fontFamilyPrimary,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w400,
                      color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              CupertinoIcons.chevron_right,
              size: 14,
              color: isDark ? AppConstants.textTertiaryDark : AppConstants.textTertiaryLight,
            ),
          ],
        ),
      ),
    );
  }
}
