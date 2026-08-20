import 'package:flutter/material.dart';
import '../../model/catalog_item_model.dart';
import '../../../../common/constants/app_constants.dart';
import '../../../../common/screen/widget/glass_card.dart';

/// Apple-Grade Catalog Solution Card
class CatalogItemCard extends StatelessWidget {
  final CatalogItemModel item;
  const CatalogItemCard({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GlassCard(
      margin: const EdgeInsets.only(bottom: AppConstants.marginMd),
      padding: const EdgeInsets.all(AppConstants.paddingLg),
      borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E1E22) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                  border: Border.all(
                    color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                  ),
                ),
                child: Text(
                  item.category,
                  style: TextStyle(
                    color: isDark ? Colors.white : AppConstants.textDark,
                    fontSize: AppConstants.fontSizeXs,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Text(
                '${item.monthlyPrice.toStringAsFixed(0)} \$ / mois',
                style: const TextStyle(
                  color: AppConstants.orangeOfficial,
                  fontSize: AppConstants.fontSizeLg,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            item.name,
            style: TextStyle(
              fontSize: AppConstants.fontSizeLg,
              fontWeight: FontWeight.w800,
              color: isDark ? Colors.white : AppConstants.textDark,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            item.description,
            style: TextStyle(
              color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
              fontSize: AppConstants.fontSizeSm,
              height: 1.4,
            ),
          ),
          if (item.setupPrice > 0) ...[
            const SizedBox(height: 10),
            Text(
              'Frais de mise en service : ${item.setupPrice.toStringAsFixed(0)} \$',
              style: TextStyle(
                color: isDark ? const Color(0xFF9CA3AF) : AppConstants.textMuted,
                fontSize: AppConstants.fontSizeXs,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
