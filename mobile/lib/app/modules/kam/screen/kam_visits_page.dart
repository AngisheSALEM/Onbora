import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../common/screen/widget/mobile_page.dart';
import 'kam_screen_helpers.dart';
import 'kam_appointment_form.dart';
import 'kam_report_page.dart';

class KamVisitsPage extends StatelessWidget {
  const KamVisitsPage({super.key});
  @override
  Widget build(BuildContext context) {
    final ctrl = workspace();
    return Obx(
      () => MobilePage(
        title: 'Mes visites',
        tabRoot: true,
        subtitle: 'Vos comptes-rendus et emails de suivi.',
        onRefresh: ctrl.reload,
        primaryLabel: 'Démarrer une réunion',
        onPrimary: ctrl.accounts.isEmpty
            ? null
            : () => Get.to(() => const KamAppointmentForm(express: true)),
        children: [
          if (ctrl.loading.value)
            const LinearProgressIndicator(color: mobilePrimary),
          if (ctrl.error.isNotEmpty)
            ReadingSection('Chargement interrompu', ctrl.error.value),
          if (!ctrl.loading.value && ctrl.visits.isEmpty)
            const ReadingSection(
              'Aucune visite',
              'Les rapports générés après vos réunions seront conservés ici.',
            ),
          for (final r in ctrl.visits)
            neutralRow(
              '${r['enterprise_name']}',
              '${dateLabel(r['created_at'])}\n${r['visit_purpose_label'] ?? ''}',
              () => Get.to(() => KamReportPage(reportId: r['id'] as int)),
            ),
        ],
      ),
    );
  }
}
