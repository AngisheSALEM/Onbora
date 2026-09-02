import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../common/constants/app_constants.dart';

/// Lightweight Credit Risk / Solvability Badge
/// Displays AAA / AA / BBB / B rating without complex accounting forms
class CreditRiskBadge extends StatelessWidget {
  final String rating;
  final String? customLabel;
  final bool compact;

  const CreditRiskBadge({
    super.key,
    required this.rating,
    this.customLabel,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Color badgeColor;
    Color badgeBg;
    String defaultLabel;
    IconData icon;

    switch (rating.toUpperCase()) {
      case 'AAA':
      case 'AA':
        badgeColor = AppConstants.successGreen;
        badgeBg = AppConstants.successGreen.withValues(alpha: isDark ? 0.15 : 0.10);
        defaultLabel = 'Grand Compte • Solvable';
        icon = LucideIcons.shieldCheck;
        break;
      case 'BBB':
        badgeColor = isDark ? const Color(0xFFA1A1AA) : const Color(0xFF4B5563);
        badgeBg = (isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA));
        defaultLabel = 'PME Solide • Acompte 30%';
        icon = LucideIcons.shieldAlert;
        break;
      default:
        badgeColor = const Color(0xFFF59E0B);
        badgeBg = const Color(0xFFF59E0B).withValues(alpha: isDark ? 0.15 : 0.10);
        defaultLabel = 'Vigilance • Paiement d\'avance';
        icon = LucideIcons.alertTriangle;
        break;
    }

    final text = customLabel ?? defaultLabel;

    if (compact) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: badgeBg,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 11, color: badgeColor),
            const SizedBox(width: 4),
            Text(
              rating,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: badgeColor,
                letterSpacing: 0.2,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: badgeBg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: badgeColor),
          const SizedBox(width: 5),
          Text(
            '$rating • $text',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: badgeColor,
            ),
          ),
        ],
      ),
    );
  }
}
