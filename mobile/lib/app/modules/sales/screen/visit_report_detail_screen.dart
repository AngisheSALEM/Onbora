import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';
import '../controller/sales_controller.dart';
import '../../../core/api/api_config.dart';
import '../../../common/screen/widget/mobile_page.dart';
import '../../../common/screen/widget/visit_report_document.dart';

class VisitReportDetailScreen extends StatelessWidget {
  const VisitReportDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final sales = Get.find<SalesController>();
    return Obx(() {
      final report = sales.currentReport.value;
      if (report == null) {
        return const MobilePage(
          title: 'Rapport de visite',
          children: [
            ReadingSection(
              'Rapport indisponible',
              'Revenez à l’historique et sélectionnez une visite.',
            ),
          ],
        );
      }
      return VisitReportDocument(
        company: sales.selectedEnterprise.value?.name ?? 'Compte client',
        report: report.toJson(),
        primaryLabel: 'Transmettre au KAM',
        busy: sales.isTransmitting.value,
        onPrimary: () async {
          final success = await sales.transmitReportToKAM();
          if (success) {
            Get.snackbar(
              'Rapport transmis',
              'Le rapport est disponible au back-office.',
            );
          }
        },
        onExport: () async {
          final uri = Uri.parse(
            '${ApiConfig.activeBaseUrl}/api/sales/visit-reports/${report.id}/export/?format=pdf',
          );
          if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
            Get.snackbar(
              'Export indisponible',
              'Réessayez dans quelques instants.',
            );
          }
        },
      );
    });
  }
}
