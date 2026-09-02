import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/kam_controller.dart';
import '../model/kam_account_model.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';

class KamAccountDetailScreen extends StatelessWidget {
  const KamAccountDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<KamController>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppConstants.backgroundDark : AppConstants.backgroundLight,
      body: Obx(() {
        final account = controller.selectedAccount.value;
        if (account == null) {
          return Center(
            child: CupertinoActivityIndicator(
              color: isDark ? Colors.white : AppConstants.primaryBlack,
            ),
          );
        }

        return CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // 1. Navigation Bar
            CupertinoSliverNavigationBar(
              automaticallyImplyLeading: false,
              transitionBetweenRoutes: false,
              backgroundColor: isDark ? AppConstants.cardDark : AppConstants.cardLight,
              border: Border(
                bottom: BorderSide(
                  color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                  width: 1,
                ),
              ),
              largeTitle: Text(
                account.name.split('(').first.trim(),
                style: AppConstants.largeTitleStyle(isDark).copyWith(fontSize: 22),
              ),
              leading: ScaleTap(
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
            ),

            // 2. Contenu Défilant
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Carte d'Identité Compte & Part de Portefeuille
                    _buildAccountSummaryCard(account, isDark),

                    const SizedBox(height: 16),

                    // Section : Organigramme Décisionnel (Comité d'Achat)
                    _buildDecisionCommitteeSection(account, isDark),

                    const SizedBox(height: 16),

                    // Section : Contrats Actifs & SLA
                    _buildContractsSection(account, isDark),

                    const SizedBox(height: 16),

                    // Section : Signaux d'Affaires Récents (Veille IA)
                    _buildSignalsSection(account, isDark),

                    const SizedBox(height: 100),
                  ],
                ),
              ),
            ),
          ],
        );
      }),
      // Bouton Flottant Inférieur Haute Visibilité : "Accéder au Briefing Pré-Visite"
      bottomSheet: Obx(() {
        final account = controller.selectedAccount.value;
        if (account == null) return const SizedBox.shrink();

        return Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          decoration: BoxDecoration(
            color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
            border: Border(
              top: BorderSide(
                color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                width: 1,
              ),
            ),
          ),
          child: ScaleTap(
            onTap: () => controller.openBriefingForAccount(account),
            child: Container(
              height: 52,
              decoration: BoxDecoration(
                color: AppConstants.primaryBtnColor(isDark),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.15),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              alignment: Alignment.center,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    CupertinoIcons.doc_text_fill,
                    color: AppConstants.primaryBtnTextColor(isDark),
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Consulter la Fiche de Briefing',
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
        );
      }),
    );
  }

  Widget _buildAccountSummaryCard(KamAccountModel account, bool isDark) {
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
                account.sector.toUpperCase(),
                style: AppConstants.overlineStyle(isDark).copyWith(
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: account.healthColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  account.healthDisplay,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: account.healthColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            account.businessSummary,
            style: TextStyle(
              fontSize: 13,
              height: 1.4,
              color: isDark ? Colors.white : AppConstants.textDark,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _buildInfoBadge('CA Est.', account.annualRevenue, isDark),
              const SizedBox(width: 8),
              _buildInfoBadge('MRR Orange', account.monthlyRevenueOrange, isDark),
              const SizedBox(width: 8),
              _buildInfoBadge('Sites', '${account.sitesCount}', isDark),
            ],
          ),
          const SizedBox(height: 14),
          // Barre de Part de Portefeuille (Share of Wallet)
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Part de portefeuille Orange',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                    ),
                  ),
                  Text(
                    '${account.walletSharePercentage.toInt()}%',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: account.walletSharePercentage / 100.0,
                  backgroundColor: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                  valueColor: AlwaysStoppedAnimation<Color>(
                    isDark ? Colors.white : AppConstants.primaryBlack,
                  ),
                  minHeight: 6,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoBadge(String label, String value, bool isDark) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF242426) : const Color(0xFFF8F8FA),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isDark ? const Color(0x1AFFFFFF) : const Color(0xFFE5E5EA),
            width: 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
              ),
            ),
            const SizedBox(height: 2),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                value,
                maxLines: 1,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDecisionCommitteeSection(KamAccountModel account, bool isDark) {
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
              Icon(CupertinoIcons.person_crop_square_fill, size: 16, color: isDark ? Colors.white : AppConstants.textDark),
              const SizedBox(width: 8),
              Text(
                'COMITÉ D\'ACHAT & DÉCIDEURS',
                style: AppConstants.overlineStyle(isDark).copyWith(
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...account.stakeholders.map<Widget>((KamStakeholder person) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 10.0),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
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
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                        ),
                        Text(
                          person.jobTitle,
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
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

  Widget _buildContractsSection(KamAccountModel account, bool isDark) {
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
              Icon(CupertinoIcons.doc_plaintext, size: 16, color: isDark ? Colors.white : AppConstants.textDark),
              const SizedBox(width: 8),
              Text(
                'CONTRATS ORANGE EN COURS',
                style: AppConstants.overlineStyle(isDark).copyWith(
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...account.activeContracts.map<Widget>((contract) {
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
                            'Échéance : ${contract.endDate}',
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
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

  Widget _buildSignalsSection(KamAccountModel account, bool isDark) {
    if (account.triggerSignals.isEmpty) return const SizedBox.shrink();

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
              Icon(CupertinoIcons.antenna_radiowaves_left_right, size: 16, color: isDark ? Colors.white : AppConstants.textDark),
              const SizedBox(width: 8),
              Text(
                'SIGNAUX D\'AFFAIRES & ACTUALITÉS',
                style: AppConstants.overlineStyle(isDark).copyWith(
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...account.triggerSignals.map<Widget>((signal) {
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          signal.category,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                          ),
                        ),
                        Text(
                          signal.date,
                          style: TextStyle(
                            fontSize: 10,
                            color: isDark ? const Color(0xFF636366) : const Color(0xFFAEAEB2),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      signal.title,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      signal.description,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
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
}
