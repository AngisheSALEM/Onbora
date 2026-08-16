import 'package:flutter/material.dart';

/// Ultra-smooth Shimmer Animation Wrapper for Skeletons (Vercel/Stripe style)
class ShimmerEffect extends StatefulWidget {
  final Widget child;
  const ShimmerEffect({super.key, required this.child});

  @override
  State<ShimmerEffect> createState() => _ShimmerEffectState();
}

class _ShimmerEffectState extends State<ShimmerEffect> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            if (bounds.isEmpty || bounds.width <= 0 || bounds.height <= 0) {
              return const LinearGradient(colors: [Colors.transparent, Colors.transparent]).createShader(bounds);
            }
            return LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              stops: const [0.0, 0.35, 0.5, 0.65, 1.0],
              colors: const [
                Color(0xFFE2E8F0),
                Color(0xFFF1F5F9),
                Colors.white,
                Color(0xFFF1F5F9),
                Color(0xFFE2E8F0),
              ],
              transform: _SlidingGradientTransform(slidePercent: _controller.value),
            ).createShader(bounds);
          },
          child: widget.child,
        );
      },
    );
  }
}

class _SlidingGradientTransform extends GradientTransform {
  final double slidePercent;
  const _SlidingGradientTransform({required this.slidePercent});

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) {
    return Matrix4.translationValues(bounds.width * (slidePercent * 2 - 1), 0, 0);
  }
}

/// Shimmer Skeleton Box
class SkeletonBox extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;

  const SkeletonBox({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.borderRadius = 12.0,
  });

  @override
  Widget build(BuildContext context) {
    return ShimmerEffect(
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: const Color(0xFFE2E8F0),
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
  }
}

/// Rich Skeleton Card for Prospects & Catalog items
class SkeletonCard extends StatelessWidget {
  const SkeletonCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const SkeletonBox(width: 52, height: 52, borderRadius: 26),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  SkeletonBox(width: 180, height: 18, borderRadius: 6),
                  SizedBox(height: 8),
                  SkeletonBox(width: 130, height: 14, borderRadius: 4),
                  SizedBox(height: 6),
                  SkeletonBox(width: 90, height: 12, borderRadius: 4),
                ],
              ),
            ),
            const SizedBox(width: 10),
            const SkeletonBox(width: 76, height: 38, borderRadius: 12),
          ],
        ),
      ),
    );
  }
}

/// Skeleton List Loader
class SkeletonListLoader extends StatelessWidget {
  final int count;
  const SkeletonListLoader({super.key, this.count = 4});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: count,
      itemBuilder: (_, index) => const SkeletonCard(),
    );
  }
}
