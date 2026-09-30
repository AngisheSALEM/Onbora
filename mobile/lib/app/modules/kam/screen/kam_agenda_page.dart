import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../common/screen/widget/mobile_page.dart';
import 'kam_screen_helpers.dart';
import 'kam_appointment_form.dart';
import 'kam_appointment_page.dart';

class KamAgendaPage extends StatefulWidget {
  const KamAgendaPage({super.key});
  @override
  State<KamAgendaPage> createState() => _KamAgendaPageState();
}

class _KamAgendaPageState extends State<KamAgendaPage> {
  String filter = 'SCHEDULED';
  @override
  Widget build(BuildContext context) {
    final ctrl = workspace();
    return Obx(
      () => MobilePage(
        title: 'Agenda',
        tabRoot: true,
        subtitle: 'Préparez et suivez vos rendez-vous.',
        onRefresh: ctrl.reload,
        primaryLabel: 'Planifier un rendez-vous',
        onPrimary: ctrl.accounts.isEmpty
            ? null
            : () => Get.to(() => const KamAppointmentForm()),
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children:
                {
                      'SCHEDULED': 'Planifiés',
                      'IN_PROGRESS': 'En cours',
                      'COMPLETED': 'Effectués',
                      'ALL': 'Tous',
                    }.entries
                    .map(
                      (e) => ChoiceChip(
                        label: Text(e.value),
                        showCheckmark: false,
                        side: BorderSide.none,
                        labelStyle: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                        backgroundColor: Theme.of(context).colorScheme.surface,
                        selectedColor: mobilePrimary.withValues(alpha: .12),
                        selected: filter == e.key,
                        onSelected: (_) => setState(() => filter = e.key),
                      ),
                    )
                    .toList(),
          ),
          const SizedBox(height: 24),
          if (ctrl.loading.value)
            const LinearProgressIndicator(color: mobilePrimary),
          if (ctrl.error.isNotEmpty)
            ReadingSection('Chargement interrompu', ctrl.error.value),
          if (!ctrl.loading.value &&
              !ctrl.appointments.any(
                (a) => filter == 'ALL' || a['status'] == filter,
              ))
            const ReadingSection(
              'Aucun rendez-vous',
              'Les rendez-vous de cette vue apparaîtront ici.',
            ),
          for (final a in ctrl.appointments.where(
            (a) => filter == 'ALL' || a['status'] == filter,
          ))
            neutralRow(
              '${a['enterprise_name']}',
              '${a['title']}\n${dateLabel(a['scheduled_at'])}\n${a['meeting_type_label']} · ${a['status_label']}',
              () => Get.to(() => KamAppointmentPage(appointment: a)),
            ),
        ],
      ),
    );
  }
}
