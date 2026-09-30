import 'package:flutter/material.dart';

/// Keeps each tab's state while synchronizing taps, back navigation and swipes.
class SwipeTabViews extends StatefulWidget {
  const SwipeTabViews({
    super.key,
    required this.index,
    required this.onChanged,
    required this.children,
  });
  final int index;
  final ValueChanged<int> onChanged;
  final List<Widget> children;

  @override
  State<SwipeTabViews> createState() => _SwipeTabViewsState();
}

class _SwipeTabViewsState extends State<SwipeTabViews> {
  late final PageController _pages = PageController(initialPage: widget.index);

  int? _target;

  @override
  void didUpdateWidget(covariant SwipeTabViews oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.index != widget.index &&
        _pages.hasClients &&
        (_pages.page ?? widget.index).round() != widget.index) {
      _target = widget.index;
      final target = _target;
      _pages
          .animateToPage(
            widget.index,
            duration: const Duration(milliseconds: 240),
            curve: Curves.easeOutCubic,
          )
          .then((_) {
            if (_target == target) _target = null;
          });
    }
  }

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  double _edgeDrag = 0;
  Widget _edge() => GestureDetector(
    behavior: HitTestBehavior.opaque,
    onHorizontalDragStart: (_) => _edgeDrag = 0,
    onHorizontalDragUpdate: (details) => _edgeDrag += details.primaryDelta ?? 0,
    onHorizontalDragEnd: (_) {
      if (_edgeDrag.abs() < 32) return;
      final next = widget.index + (_edgeDrag < 0 ? 1 : -1);
      if (next >= 0 && next < widget.children.length) {
        _pages.animateToPage(
          next,
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOutCubic,
        );
      }
    },
  );

  @override
  Widget build(BuildContext context) => Stack(
    fit: StackFit.expand,
    children: [
      PageView(
        controller: _pages,
        onPageChanged: (index) {
          if (_target == null && index != widget.index) widget.onChanged(index);
        },
        children: widget.children
            .map((child) => _KeptTab(child: child))
            .toList(),
      ),
      // Map gestures and editable text keep their behavior in the centre. Edges
      // remain available for switching tabs even when a map owns the gesture.
      Positioned(left: 0, top: 0, bottom: 0, width: 20, child: _edge()),
      Positioned(right: 0, top: 0, bottom: 0, width: 20, child: _edge()),
    ],
  );
}

class _KeptTab extends StatefulWidget {
  const _KeptTab({required this.child});
  final Widget child;
  @override
  State<_KeptTab> createState() => _KeptTabState();
}

class _KeptTabState extends State<_KeptTab> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;
  @override
  Widget build(BuildContext context) {
    super.build(context);
    return widget.child;
  }
}
