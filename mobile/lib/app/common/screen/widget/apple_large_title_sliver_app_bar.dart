import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import '../../constants/app_constants.dart';

/// Apple Music & iOS Human Interface Guidelines Collapsible Large Title SliverAppBar
/// - Large Title (32px Bold) sits on the left when expanded.
/// - When scrolling down, the title smoothly shrinks (32px -> 18px) and glides into the pinned
///   navigation bar on the LEFT (matching Apple Music / iOS native behavior in animation.mp4).
/// - Frosted translucent backdrop and hairline separator activate seamlessly on scroll.
class AppleLargeTitleSliverAppBar extends StatelessWidget {
  final String title;
  final Widget? leading;
  final List<Widget>? actions;
  final double expandedHeight;
  final double collapsedHeight;

  const AppleLargeTitleSliverAppBar({
    super.key,
    required this.title,
    this.leading,
    this.actions,
    this.expandedHeight = 98.0,
    this.collapsedHeight = 44.0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final topPadding = MediaQuery.of(context).padding.top;
    final minExtent = topPadding + collapsedHeight;
    final maxExtent = topPadding + expandedHeight;

    return SliverPersistentHeader(
      pinned: true,
      delegate: _AppleLargeTitleDelegate(
        title: title,
        leading: leading,
        actions: actions,
        minExtent: minExtent,
        maxExtent: maxExtent,
        topPadding: topPadding,
        collapsedHeight: collapsedHeight,
        isDark: isDark,
      ),
    );
  }
}

class _AppleLargeTitleDelegate extends SliverPersistentHeaderDelegate {
  final String title;
  final Widget? leading;
  final List<Widget>? actions;
  @override
  final double minExtent;
  @override
  final double maxExtent;
  final double topPadding;
  final double collapsedHeight;
  final bool isDark;

  _AppleLargeTitleDelegate({
    required this.title,
    this.leading,
    this.actions,
    required this.minExtent,
    required this.maxExtent,
    required this.topPadding,
    required this.collapsedHeight,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    final scrollDelta = maxExtent - minExtent;
    // progress: 0.0 when fully expanded at top, 1.0 when fully collapsed/pinned
    final progress = scrollDelta > 0 ? (shrinkOffset / scrollDelta).clamp(0.0, 1.0) : 0.0;

    // Background frosted glass opacity and blur interpolation
    final bgOpacity = (progress * 0.92).clamp(0.0, 0.92);
    final borderOpacity = progress.clamp(0.0, 1.0);

    // Font size & letter spacing interpolation
    final fontSize = ui.lerpDouble(32.0, 18.0, progress)!;
    final letterSpacing = ui.lerpDouble(-0.6, -0.2, progress)!;

    // Horizontal left position (Left-aligned always, offsets next to leading icon if present)
    final leftOffset = leading != null
        ? ui.lerpDouble(18.0, 56.0, progress)!
        : 18.0;

    // Vertical top position (Glides smoothly from below status bar into the 44px top navigation bar)
    final expandedTop = topPadding + (leading != null ? 50.0 : 46.0);
    final collapsedTop = topPadding + (collapsedHeight - (18.0 * 1.2)) / 2;
    final topOffset = ui.lerpDouble(expandedTop, collapsedTop, progress)!;

    final hasActions = actions != null && actions!.isNotEmpty;

    return Stack(
      fit: StackFit.expand,
      children: [
        // 1. Frosted Glass Translucent Background
        if (progress > 0.02)
          ClipRect(
            child: BackdropFilter(
              filter: ui.ImageFilter.blur(sigmaX: 20.0 * progress, sigmaY: 20.0 * progress),
              child: Container(
                color: isDark
                    ? const Color(0xFF000000).withValues(alpha: bgOpacity)
                    : const Color(0xFFFFFFFF).withValues(alpha: bgOpacity),
              ),
            ),
          )
        else
          Container(
            color: isDark ? AppConstants.backgroundDark : AppConstants.backgroundLight,
          ),

        // 2. Hairline Separator Border on Scroll
        if (borderOpacity > 0.05)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Opacity(
              opacity: borderOpacity,
              child: Container(
                height: 0.5,
                color: isDark ? const Color(0x33FFFFFF) : const Color(0x33000000),
              ),
            ),
          ),

        // 3. Leading Button (Top Left Pinned)
        if (leading != null)
          Positioned(
            top: topPadding + (collapsedHeight - 36.0) / 2,
            left: 12.0,
            child: SizedBox(
              width: 36.0,
              height: 36.0,
              child: leading!,
            ),
          ),

        // 4. Trailing Action Buttons (Top Right Pinned)
        if (hasActions)
          Positioned(
            top: topPadding + (collapsedHeight - 36.0) / 2,
            right: 12.0,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: actions!,
            ),
          ),

        // 5. Left-Aligned Smoothly Scaling & Gliding Large Title (Apple Music Animation)
        Positioned(
          top: topOffset,
          left: leftOffset,
          right: hasActions ? 90.0 : 18.0,
          child: Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.w800,
              letterSpacing: letterSpacing,
              height: 1.15,
              color: isDark ? Colors.white : AppConstants.textDark,
            ),
          ),
        ),
      ],
    );
  }

  @override
  bool shouldRebuild(covariant _AppleLargeTitleDelegate oldDelegate) {
    return oldDelegate.title != title ||
        oldDelegate.leading != leading ||
        oldDelegate.actions != actions ||
        oldDelegate.minExtent != minExtent ||
        oldDelegate.maxExtent != maxExtent ||
        oldDelegate.isDark != isDark;
  }
}
