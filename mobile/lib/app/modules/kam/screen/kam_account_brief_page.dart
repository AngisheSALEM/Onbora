import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/kam_workspace_controller.dart';
import '../../../common/screen/widget/mobile_page.dart';
import 'kam_appointment_form.dart';

class KamAccountBriefPage extends StatelessWidget {
  const KamAccountBriefPage({super.key, required this.account});
  final KamData account;
  @override
  Widget build(BuildContext context) {
    final b = account['briefing'] as Map? ?? {};
    final strategy = b['visit_strategy'] as Map? ?? {};
    final relation = b['orange_relationship'] as Map? ?? {};
    return MobilePage(
      title: 'Briefing du compte',
      subtitle: '${account['account_name']}',
      primaryLabel: 'Planifier un rendez-vous',
      onPrimary: () => Get.to(() => KamAppointmentForm(account: account)),
      children: [
        ReadingSection(
          'Objectif',
          readableValue(strategy['primary_objective']),
        ),
        ReadingSection(
          'Déroulé proposé',
          readableValue(strategy['suggested_agenda']),
        ),
        ReadingSection(
          'Points de vigilance',
          readableValue(strategy['traps_to_avoid']),
        ),
        ReadingSection(
          'Contexte du compte',
          readableValue(
            (b['firmographics'] as Map?)?['business_model_summary'],
          ),
        ),
        ReadingSection(
          'Incidents et qualité de service',
          readableValue(relation['critical_incidents_summary']),
        ),
        for (final contact in b['stakeholders_mapping'] as List? ?? [])
          ReadingSection(
            '${contact['full_name'] ?? contact['name']}',
            '${contact['job_title'] ?? ''}\n${contact['key_notes'] ?? ''}',
          ),
        ReadingSection(
          'Décideurs à confirmer',
          readableValue(b['missing_stakeholders_alert']),
        ),
        for (final contract in relation['active_contracts'] as List? ?? [])
          ReadingSection(
            '${contract['service_name']}',
            '${contract['monthly_value']} USD / mois\nÉchéance : ${contract['end_date']}\nService : ${contract['sla_status']}',
          ),
      ],
    );
  }
}
