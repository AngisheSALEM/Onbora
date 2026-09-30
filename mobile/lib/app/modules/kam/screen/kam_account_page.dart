import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/kam_workspace_controller.dart';
import '../../../common/screen/widget/mobile_page.dart';
import 'kam_screen_helpers.dart';
import 'kam_appointment_form.dart';
import 'kam_account_editor.dart';
import 'kam_commercial_outcome_page.dart';
import 'kam_account_brief_page.dart';
import 'kam_account_memory_page.dart';
import 'kam_intelligence_screen.dart';

class KamAccountPage extends StatelessWidget {
  const KamAccountPage({super.key, required this.account});
  final KamData account;
  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final account =
          workspace().accounts.firstWhereOrNull(
            (a) => a['account_id'] == this.account['account_id'],
          ) ??
          this.account;
      final briefing = account['briefing'] as Map? ?? {};
      final relationship = briefing['orange_relationship'] as Map? ?? {};
      return MobilePage(
        title: '${account['account_name']}',
        subtitle: '${account['crm_id']} · ${account['status_label']}',
        primaryLabel: 'Planifier un rendez-vous',
        onPrimary: () => Get.to(() => KamAppointmentForm(account: account)),
        children: [
          TextButton(
            onPressed: () =>
                Get.to(() => KamIntelligencePage(account: account)),
            child: const Text('Analyse du compte et solutions recommandées'),
          ),
          ReadingSection(
            'Contact',
            [
              account['contact_name'],
              account['contact_role'],
              account['contact_phone'],
              account['contact_email'],
            ].where((s) => s != null && '$s'.isNotEmpty).join('\n'),
          ),
          TextButton(
            onPressed: () =>
                Get.to(() => KamCommercialOutcomePage(account: account)),
            child: const Text('Mettre à jour le résultat commercial'),
          ),
          ReadingSection('Localisation', readableValue(account['location'])),
          ReadingSection(
            'Connectivité actuelle',
            [
              account['current_operator'],
              account['current_connectivity'],
            ].where((s) => s != null && '$s'.isNotEmpty).join(' · '),
          ),
          ReadingSection(
            'Projet de développement',
            readableValue(account['growth_project']),
          ),
          ReadingSection(
            'Échéance du contrat Orange',
            readableValue(account['orange_contract_end_date']),
          ),
          ReadingSection(
            'Dernières interactions',
            readableValue(relationship['last_interactions_summary']),
          ),
          TextButton(
            onPressed: () => Get.to(() => KamAccountEditor(account: account)),
            child: const Text('Compléter la fiche du compte'),
          ),
          TextButton(
            onPressed: () => Get.to(
              () => KamAppointmentForm(account: account, express: true),
            ),
            child: const Text('Démarrer une réunion express'),
          ),
          TextButton(
            onPressed: () =>
                Get.to(() => KamAccountBriefPage(account: account)),
            child: const Text('Consulter le briefing du compte'),
          ),
          TextButton(
            onPressed: () => Get.to(() => KamSignalsPage(account: account)),
            child: const Text('Risques et opportunités du compte'),
          ),
          TextButton(
            onPressed: () =>
                Get.to(() => KamAccountMemoryPage(account: account)),
            child: const Text('Mémoire du compte'),
          ),
        ],
      );
    });
  }
}
