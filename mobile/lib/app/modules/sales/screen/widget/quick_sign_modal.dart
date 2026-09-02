import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../common/constants/app_constants.dart';
import '../../../../common/screen/widget/scale_tap.dart';
import '../../controller/sales_controller.dart';
import '../../model/enterprise_model.dart';

/// Interactive Tactile Signature Pad Canvas
class _SignaturePainter extends CustomPainter {
  final List<Offset?> points;
  final Color strokeColor;

  _SignaturePainter({required this.points, required this.strokeColor});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = strokeColor
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 2.5;

    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != null && points[i + 1] != null) {
        canvas.drawLine(points[i]!, points[i + 1]!, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_SignaturePainter oldDelegate) => true;
}

/// Quick Sign Modal: Tactile Agreement Signature
/// Allows field sales rep to capture customer's approval in 5 seconds
class QuickSignModal extends StatefulWidget {
  final EnterpriseModel enterprise;
  final String offerName;
  final double monthlyPrice;

  const QuickSignModal({
    super.key,
    required this.enterprise,
    this.offerName = 'Fibre Optique Pro 100M',
    this.monthlyPrice = 249.0,
  });

  static void show(BuildContext context, {
    required EnterpriseModel enterprise,
    String offerName = 'Fibre Optique Pro 100M',
    double monthlyPrice = 249.0,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => QuickSignModal(
        enterprise: enterprise,
        offerName: offerName,
        monthlyPrice: monthlyPrice,
      ),
    );
  }

  @override
  State<QuickSignModal> createState() => _QuickSignModalState();
}

class _QuickSignModalState extends State<QuickSignModal> {
  final List<Offset?> _points = [];
  bool _isSigned = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final salesController = Get.find<SalesController>();

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF141416) : Colors.white,
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
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle
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
              'ACCORD DE PRINCIPE & ÉLIGIBILITÉ',
              style: AppConstants.overlineStyle(isDark),
            ),
            const SizedBox(height: 4),

            // Titre de Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    widget.enterprise.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppConstants.title2Style(isDark),
                  ),
                ),
                Text(
                  '${widget.monthlyPrice.toStringAsFixed(0)} \$ / mois',
                  style: TextStyle(
                    color: isDark ? Colors.white : AppConstants.textDark,
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Offre sélectionnée : ${widget.offerName}',
              style: AppConstants.subheadStyle(isDark),
            ),
            const SizedBox(height: 14),

            // Canvas de Signature Tactile
            Container(
              height: 160,
              width: double.infinity,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1C1C1E) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? AppConstants.dividerDark : AppConstants.dividerLight,
                ),
              ),
              child: Stack(
                children: [
                  GestureDetector(
                    onPanUpdate: (details) {
                      final box = context.findRenderObject() as RenderBox?;
                      if (box != null) {
                        setState(() {
                          _points.add(details.localPosition);
                          _isSigned = true;
                        });
                      }
                    },
                    onPanEnd: (_) => _points.add(null),
                    child: CustomPaint(
                      painter: _SignaturePainter(
                        points: _points,
                        strokeColor: isDark ? Colors.white : Colors.black,
                      ),
                      size: Size.infinite,
                    ),
                  ),
                  if (!_isSigned)
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            LucideIcons.penTool,
                            size: 24,
                            color: isDark ? Colors.white30 : Colors.black26,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Apposez la signature du client ici',
                            style: AppConstants.subheadStyle(isDark).copyWith(fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: ScaleTap(
                      onTap: () {
                        setState(() {
                          _points.clear();
                          _isSigned = false;
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(LucideIcons.rotateCcw, size: 12, color: isDark ? Colors.white70 : AppConstants.textDark),
                            const SizedBox(width: 4),
                            Text(
                              'Effacer',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white70 : AppConstants.textDark,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: ScaleTap(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF27272A) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                      ),
                      child: Center(
                        child: Text(
                          'Annuler',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white70 : AppConstants.textDark,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ScaleTap(
                    onTap: () {
                      if (!_isSigned) {
                        Get.snackbar(
                          'Signature requise',
                          'Veuillez apposer la signature du décideur sur le cadre tactile.',
                          backgroundColor: AppConstants.errorRed,
                          colorText: Colors.white,
                          snackPosition: SnackPosition.BOTTOM,
                          margin: const EdgeInsets.all(16),
                        );
                        return;
                      }

                      salesController.confirmQuickAgreement(
                        widget.enterprise,
                        widget.offerName,
                        widget.monthlyPrice,
                      );
                      Navigator.pop(context);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      decoration: BoxDecoration(
                        color: AppConstants.primaryBtnColor(isDark),
                        borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            LucideIcons.checkCircle,
                            size: 16,
                            color: AppConstants.primaryBtnTextColor(isDark),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Valider l\'Accord (+20 pts)',
                            style: TextStyle(
                              fontSize: 13,
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
    );
  }
}
