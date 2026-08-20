import 'package:flutter/material.dart';
import '../../constants/app_constants.dart';
import 'scale_tap.dart';

/// Composant Carte Optimisé (Haute Performance & Zéro Surcharge GPU)
/// Reproduit le style visuel Apple dépoli grâce à des surfaces translucides haute fidélité,
/// sans saturer le bus mémoire du processeur graphique (Mali/MediaTek).
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final BorderRadius? borderRadius;
  final Border? border;
  final Color? color;
  final VoidCallback? onTap;

  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.borderRadius,
    this.border,
    this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final rRadius = borderRadius ?? BorderRadius.circular(AppConstants.borderRadiusAppleCard);

    final defaultBgColor = color ??
        (isDark ? const Color(0xEE18181B) : const Color(0xF8FFFFFF));

    final defaultBorder = border ??
        Border.all(
          color: isDark ? const Color(0x33FFFFFF) : const Color(0x1A000000),
          width: 1.0,
        );

    Widget cardBody = Container(
      margin: margin,
      decoration: BoxDecoration(
        color: defaultBgColor,
        borderRadius: rRadius,
        border: defaultBorder,
        boxShadow: [
          if (isDark)
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.35),
              blurRadius: 16,
              offset: const Offset(0, 4),
              spreadRadius: 0,
            )
          else
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 14,
              offset: const Offset(0, 4),
              spreadRadius: 0,
            ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: rRadius,
        child: Padding(
          padding: padding ?? const EdgeInsets.all(AppConstants.paddingLg),
          child: child,
        ),
      ),
    );

    if (onTap != null) {
      return ScaleTap(
        onTap: onTap,
        child: cardBody,
      );
    }

    return cardBody;
  }
}
