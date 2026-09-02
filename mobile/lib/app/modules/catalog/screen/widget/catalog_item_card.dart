import 'package:flutter/material.dart';
import '../../model/catalog_item_model.dart';
import '../../../../common/constants/app_constants.dart';

/// Apple-Grade Catalog Solution Card
/// - Surtitre (11px Uppercase) : Catégorie
/// - Titre Élément Primaire (16px Semi-Bold) : Nom de l'offre
/// - Métadonnées (13px Regular) : Description & Prix (Noir/Blanc neutre)
/// - Conteneur Blanc Pur (#FFFFFF) en Light Mode sur fond #F4F4F6 avec bordure fine et ombre douce.
class CatalogItemCard extends StatelessWidget {
  final CatalogItemModel item;
  const CatalogItemCard({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: AppConstants.marginMd),
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
              // Surtitre / Catégorie (11px Bold Majuscule) avec protection responsive
              Expanded(
                child: Text(
                  item.category.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppConstants.overlineStyle(isDark).copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Prix : Métadonnées en Blanc 100% (Dark) ou Noir 100% (Light)
              Text(
                '${item.monthlyPrice.toStringAsFixed(0)} \$ / mois',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Titre d'Élément Primaire (16px Semi-Bold)
          Text(
            item.name,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.2,
              color: isDark ? Colors.white : AppConstants.textDark,
            ),
          ),
          const SizedBox(height: 6),
          // Métadonnées / Description (13px Regular #6B7280)
          Text(
            item.description,
            style: TextStyle(
              fontSize: 13,
              height: 1.4,
              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
            ),
          ),
          if (item.setupPrice > 0) ...[
            const SizedBox(height: 8),
            Text(
              'Mise en service : ${item.setupPrice.toStringAsFixed(0)} \$',
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w500,
                color: isDark ? const Color(0xFF8E8E93) : const Color(0xFF8E8E93),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
