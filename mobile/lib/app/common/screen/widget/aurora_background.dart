import 'package:flutter/material.dart';
import '../../constants/app_constants.dart';

/// Minimalist Orange Brand Stage (Eco-Branding Digital)
/// - Dark Mode: Pure Obsidian Black (#000000) with subtle ambient Orange (#FF7900 @ 14%)
/// - Light Mode: Clean Studio Off-White (#F7F7F7) with soft ambient Orange (#FF7900 @ 6%)
/// Pure 120 FPS performance with zero unnecessary GPU shader passes.
class AuroraBackground extends StatelessWidget {
  final Widget child;

  const AuroraBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Stack(
      fit: StackFit.expand,
      children: [
        // 1. Eco-Branding Background Canvas
        RepaintBoundary(
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Solid Black or Studio Light
              ColoredBox(
                color: isDark ? AppConstants.pureBlack : AppConstants.backgroundLight,
              ),

              // Signature Orange Ambient Highlight (Top Center)
              Positioned(
                top: -120,
                left: 0,
                right: 0,
                height: 320,
                child: IgnorePointer(
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        center: Alignment.topCenter,
                        radius: 0.9,
                        colors: [
                          isDark ? AppConstants.glowOrangeDark : AppConstants.glowOrangeLight,
                          Colors.transparent,
                        ],
                        stops: const [0.0, 1.0],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // 2. Foreground Dynamic Content
        child,
      ],
    );
  }
}
