import 'package:flutter/material.dart';
import '../../constants/app_constants.dart';

/// Pure Apple OLED Dark / Studio Light Canvas
/// - Dark Mode: Pure Obsidian OLED Black (#121212) for razor-sharp typography and contrast
/// - Light Mode: Clean Apple Studio Off-White (#F7F7F8)
class AuroraBackground extends StatelessWidget {
  final Widget child;

  const AuroraBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Stack(
      fit: StackFit.expand,
      children: [
        // Solid OLED Black or Studio Light Canvas
        ColoredBox(
          color: isDark ? AppConstants.pureBlack : AppConstants.backgroundLight,
        ),
        // Foreground Dynamic Content
        child,
      ],
    );
  }
}

