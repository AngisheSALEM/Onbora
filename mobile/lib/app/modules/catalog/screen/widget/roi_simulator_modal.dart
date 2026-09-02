import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../common/constants/app_constants.dart';
import '../../../../common/screen/widget/scale_tap.dart';
import '../../../sales/controller/sales_controller.dart';
import '../../../sales/model/enterprise_model.dart';
import '../../../sales/screen/widget/deal_share_modal.dart';
import '../../../sales/screen/widget/quick_sign_modal.dart';

/// Instant ROI & Pricing Simulator in 3 Sliders
/// Calculates monthly subscription and estimated client savings in real time
class RoiSimulatorModal extends StatefulWidget {
  final EnterpriseModel? enterprise;

  const RoiSimulatorModal({super.key, this.enterprise});

  static void show(BuildContext context, {EnterpriseModel? enterprise}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RoiSimulatorModal(enterprise: enterprise),
    );
  }

  @override
  State<RoiSimulatorModal> createState() => _RoiSimulatorModalState();
}

class _RoiSimulatorModalState extends State<RoiSimulatorModal> {
  double _collaborators = 25.0;
  double _bandwidthIndex = 2.0; // 0=20M, 1=50M, 2=100M, 3=200M, 4=500M, 5=1G
  int _securityTier = 1; // 0=Essentiel, 1=Avancé, 2=Entreprise

  static const List<int> _bandwidthOptions = [20, 50, 100, 200, 500, 1000];
  static const List<double> _bandwidthBasePrices = [99.0, 169.0, 249.0, 399.0, 699.0, 1199.0];
  static const List<String> _securityTierNames = ['Essentiel (Firewall)', 'Avancé (+ Cloud 365)', 'Entreprise (+ SOC 24/7)'];
  static const List<double> _securityTierPrices = [0.0, 49.0, 129.0];

  double get _monthlyPrice {
    final base = _bandwidthBasePrices[_bandwidthIndex.toInt()];
    final sec = _securityTierPrices[_securityTier];
    final userAddon = _collaborators > 50 ? (_collaborators - 50) * 1.5 : 0.0;
    return base + sec + userAddon;
  }

  double get _estimatedCompetitorPrice {
    return _monthlyPrice * 1.32; // ~32% plus cher chez les alternatives
  }

  double get _monthlySavings {
    return _estimatedCompetitorPrice - _monthlyPrice;
  }

  String get _bundleName {
    final bw = _bandwidthOptions[_bandwidthIndex.toInt()];
    return 'Fibre Pro ${bw}M + ${_securityTierNames[_securityTier].split(' ')[0]}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final salesController = Get.isRegistered<SalesController>() ? Get.find<SalesController>() : null;
    final targetEnterprise = widget.enterprise ??
        salesController?.selectedEnterprise.value ??
        EnterpriseModel(
          id: 999,
          name: 'Prospect Client',
          sector: 'Entreprise B2B',
          approximateSize: '${_collaborators.toInt()} employés',
        );

    final currentBw = _bandwidthOptions[_bandwidthIndex.toInt()];

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppConstants.cardDark : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 24,
            offset: const Offset(0, -6),
          ),
        ],
      ),
      padding: EdgeInsets.fromLTRB(
        AppConstants.paddingLg,
        12,
        AppConstants.paddingLg,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag Handle
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white24 : Colors.black12,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Surtitre / Eyebrow
              Text(
                'SIMULATEUR DE TARIF & GAIN CLIENT',
                style: AppConstants.overlineStyle(isDark).copyWith(
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                ),
              ),
              const SizedBox(height: 4),

              // Titre de Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'Simulateur ROI Express',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppConstants.successGreen.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '-${(_monthlySavings / _estimatedCompetitorPrice * 100).toStringAsFixed(0)}% d\'économie',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppConstants.successGreen,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 1. Slider 1 : Nombre de Collaborateurs
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Collaborateurs / Postes',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                  Text(
                    '${_collaborators.toInt()} postes',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                ],
              ),
              Slider(
                value: _collaborators,
                min: 5,
                max: 200,
                divisions: 39,
                activeColor: isDark ? Colors.white : AppConstants.primaryBlack,
                inactiveColor: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                onChanged: (val) => setState(() => _collaborators = val),
              ),
              const SizedBox(height: 10),

              // 2. Slider 2 : Débit Fibre Dédiée
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Débit Fibre Optique Pro',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                  Text(
                    currentBw >= 1000 ? '1 Gbps Dédié' : '$currentBw Mbps Dédié',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                ],
              ),
              Slider(
                value: _bandwidthIndex,
                min: 0,
                max: (_bandwidthOptions.length - 1).toDouble(),
                divisions: _bandwidthOptions.length - 1,
                activeColor: isDark ? Colors.white : AppConstants.primaryBlack,
                inactiveColor: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                onChanged: (val) => setState(() => _bandwidthIndex = val),
              ),
              const SizedBox(height: 10),

              // 3. Sélecteur 3 : Pack Cybersécurité & Cloud
              Text(
                'Pack Sécurité & Services',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: List.generate(_securityTierNames.length, (idx) {
                  final isSelected = _securityTier == idx;
                  return Expanded(
                    child: ScaleTap(
                      onTap: () => setState(() => _securityTier = idx),
                      child: Container(
                        margin: EdgeInsets.only(right: idx < 2 ? 6 : 0),
                        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? (isDark ? Colors.white : AppConstants.primaryBlack)
                              : (isDark ? const Color(0xFF1C1C1E) : const Color(0xFFF2F2F7)),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isSelected
                                ? Colors.transparent
                                : (isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight),
                            width: 1,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            _securityTierNames[idx].split(' ')[0],
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: isSelected
                                  ? (isDark ? Colors.black : Colors.white)
                                  : (isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280)),
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 18),

              // Synthèse de Calcul (Carte Résultat)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF18181B) : const Color(0xFFF4F4F6),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                    width: 1,
                  ),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'TARIF ORANGE B2B',
                              style: AppConstants.overlineStyle(isDark).copyWith(
                                fontWeight: FontWeight.w700,
                                color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${_monthlyPrice.toStringAsFixed(0)} \$ / mois',
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: isDark ? Colors.white : AppConstants.textDark,
                              ),
                            ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              'ÉCONOMIE CLIENT',
                              style: AppConstants.overlineStyle(isDark).copyWith(
                                fontWeight: FontWeight.w700,
                                color: AppConstants.successGreen,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '~${_monthlySavings.toStringAsFixed(0)} \$ / mois',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: AppConstants.successGreen,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Divider(color: isDark ? AppConstants.dividerDark : AppConstants.dividerLight, height: 1),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            'GTR 4h garantie • IP Fixe & Routeur inclus',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Frais d\'accès : 0 \$',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Actions Directes : Partager WhatsApp ou Faire Signer
              Row(
                children: [
                  Expanded(
                    child: ScaleTap(
                      onTap: () {
                        Navigator.pop(context);
                        DealShareModal.show(
                          context,
                          enterprise: targetEnterprise,
                          offerName: _bundleName,
                          monthlyPrice: _monthlyPrice,
                          estimatedSavings: _monthlySavings,
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        decoration: BoxDecoration(
                          color: const Color(0xFF25D366),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.messageSquare, size: 15, color: Colors.white),
                            SizedBox(width: 6),
                            Text(
                              'Partager WhatsApp',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ScaleTap(
                      onTap: () {
                        Navigator.pop(context);
                        QuickSignModal.show(
                          context,
                          enterprise: targetEnterprise,
                          offerName: _bundleName,
                          monthlyPrice: _monthlyPrice,
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        decoration: BoxDecoration(
                          color: AppConstants.primaryBtnColor(isDark),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              LucideIcons.penTool,
                              size: 15,
                              color: AppConstants.primaryBtnTextColor(isDark),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Signer l\'Accord',
                              style: TextStyle(
                                fontSize: 12,
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
            ],
          ),
        ),
      ),
    );
  }
}
