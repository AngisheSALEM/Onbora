import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../common/constants/app_constants.dart';
import '../../../../common/screen/widget/scale_tap.dart';
import '../../controller/sales_controller.dart';
import '../../model/enterprise_model.dart';

/// Instant WhatsApp & Email Digital Proposal Share Modal
class DealShareModal extends StatelessWidget {
  final EnterpriseModel enterprise;
  final String offerName;
  final double monthlyPrice;
  final double estimatedSavings;

  const DealShareModal({
    super.key,
    required this.enterprise,
    this.offerName = 'Fibre Optique Pro 100M',
    this.monthlyPrice = 249.0,
    this.estimatedSavings = 80.0,
  });

  static void show(BuildContext context, {
    required EnterpriseModel enterprise,
    String offerName = 'Fibre Optique Pro 100M',
    double monthlyPrice = 249.0,
    double estimatedSavings = 80.0,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DealShareModal(
        enterprise: enterprise,
        offerName: offerName,
        monthlyPrice: monthlyPrice,
        estimatedSavings: estimatedSavings,
      ),
    );
  }

  String _buildShareMessage(String salesName) {
    final dealUrl = 'https://onbora.orange.cd/p/${enterprise.id}';
    return '''Bonjour,\n\nSuite à notre échange, voici la proposition personnalisée Orange B2B pour *${enterprise.name}* :\n\n• Offre : *$offerName*\n• Tarif négocié : *${monthlyPrice.toStringAsFixed(0)} \$ / mois*\n• Économie estimée : *~${estimatedSavings.toStringAsFixed(0)} \$ / mois* vs infrastructure actuelle\n• Garantie : GTR 4h & Débit symétrique dédié\n\nConsultez les détails et activez votre test d'éligibilité ici :\n$dealUrl\n\nCordialement,\n$salesName - Orange Business RDC''';
  }

  Future<void> _launchWhatsApp(String message) async {
    final encoded = Uri.encodeComponent(message);
    final uri = Uri.parse('whatsapp://send?text=$encoded');
    final webUri = Uri.parse('https://wa.me/?text=$encoded');

    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {
      await launchUrl(webUri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _launchEmail(String subject, String body) async {
    final emailUri = Uri(
      scheme: 'mailto',
      queryParameters: {
        'subject': subject,
        'body': body,
      },
    );

    try {
      if (await canLaunchUrl(emailUri)) {
        await launchUrl(emailUri);
      } else {
        Get.snackbar(
          'Email',
          'Impossible d\'ouvrir l\'application email.',
          snackPosition: SnackPosition.BOTTOM,
          margin: const EdgeInsets.all(16),
        );
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final salesController = Get.find<SalesController>();
    const salesName = 'Commercial Orange B2B';
    final message = _buildShareMessage(salesName);
    final emailSubject = 'Proposition Orange B2B - ${enterprise.name}';

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
              'PARTAGE DE LA PROPOSITION',
              style: AppConstants.overlineStyle(isDark),
            ),
            const SizedBox(height: 4),

            // Titre de Section
            Text(
              enterprise.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppConstants.title2Style(isDark),
            ),
            const SizedBox(height: 12),

            // Aperçu Message
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1C1C1E) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? AppConstants.dividerDark : AppConstants.dividerLight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        LucideIcons.messageSquare,
                        size: 14,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Aperçu du contenu à envoyer',
                        style: AppConstants.overlineStyle(isDark).copyWith(
                          color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    message,
                    maxLines: 6,
                    overflow: TextOverflow.ellipsis,
                    style: AppConstants.subheadStyle(isDark).copyWith(
                      fontSize: 12,
                      color: isDark ? Colors.white70 : AppConstants.textDark,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Choix du canal d'envoi : WhatsApp & Email
            Row(
              children: [
                // Option 1 : WhatsApp
                Expanded(
                  child: ScaleTap(
                    onTap: () {
                      _launchWhatsApp(message);
                      salesController.trackProposalSent(enterprise.name);
                      Navigator.pop(context);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      decoration: BoxDecoration(
                        color: const Color(0xFF25D366),
                        borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.messageCircle, size: 18, color: Colors.white),
                          SizedBox(width: 6),
                          Text(
                            'WhatsApp',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),

                // Option 2 : Email
                Expanded(
                  child: ScaleTap(
                    onTap: () {
                      _launchEmail(emailSubject, message);
                      salesController.trackProposalSent(enterprise.name);
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
                            LucideIcons.mail,
                            size: 18,
                            color: AppConstants.primaryBtnTextColor(isDark),
                          ),
                          SizedBox(width: 6),
                          Text(
                            'Email',
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
            const SizedBox(height: 10),

            // Option 3 : Copier le texte
            ScaleTap(
              onTap: () {
                Clipboard.setData(ClipboardData(text: message));
                Get.snackbar(
                  'Copié !',
                  'Message copié dans le presse-papiers.',
                  snackPosition: SnackPosition.BOTTOM,
                  margin: const EdgeInsets.all(16),
                  backgroundColor: isDark ? const Color(0xFF27272A) : Colors.black87,
                  colorText: Colors.white,
                );
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF27272A) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(LucideIcons.copy, size: 14, color: isDark ? Colors.white70 : AppConstants.textDark),
                    const SizedBox(width: 6),
                    Text(
                      'Copier le texte',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white70 : AppConstants.textDark,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
