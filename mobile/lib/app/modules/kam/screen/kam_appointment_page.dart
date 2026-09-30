import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/kam_workspace_controller.dart';
import '../../../common/screen/widget/mobile_page.dart';
import 'kam_screen_helpers.dart';
import 'kam_appointment_form.dart';
import 'kam_report_page.dart';
import 'kam_meeting_page.dart';
import 'package:url_launcher/url_launcher.dart';

class KamAppointmentPage extends StatefulWidget {
  const KamAppointmentPage({super.key, required this.appointment});
  final KamData appointment;
  @override
  State<KamAppointmentPage> createState() => _KamAppointmentPageState();
}

class _KamAppointmentPageState extends State<KamAppointmentPage> {
  KamData? _preparation;
  String _error = '';
  late KamData _appointment;
  @override
  void initState() {
    super.initState();
    _appointment = widget.appointment;
    _load();
  }

  Future<void> _load() async {
    try {
      final fresh = KamData.from(
        await workspace().api.get(
              '/api/kam/appointments/${_appointment['id']}/',
            )
            as Map,
      );
      final prep = KamData.from(
        await workspace().api.get(
              '/api/kam/appointments/${_appointment['id']}/preparation/',
            )
            as Map,
      );
      if (mounted) {
        setState(() {
          _appointment = fresh;
          _preparation = prep;
          _error = '';
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final a = _appointment;
    final completed = a['has_report'] == true,
        cancelled = a['status'] == 'CANCELLED';
    return MobilePage(
      title: '${a['enterprise_name']}',
      subtitle: '${a['title']}\n${dateLabel(a['scheduled_at'])}',
      onRefresh: _load,
      primaryLabel: cancelled
          ? null
          : completed
          ? 'Voir le rapport'
          : 'Commencer la réunion',
      onPrimary: () async {
        if (completed) {
          Get.to(() => KamReportPage(reportId: a['report_id'] as int));
          return;
        }
        try {
          final fresh = KamData.from(
            await workspace().api.patch(
                  '/api/kam/appointments/${a['id']}/',
                  body: {'status': 'IN_PROGRESS'},
                )
                as Map,
          );
          workspace().selectedAppointment = fresh;
          Get.to(() => KamMeetingPage(appointment: fresh));
        } catch (e) {
          if (mounted) setState(() => _error = '$e');
        }
      },
      children: [
        ReadingSection(
          'Rendez-vous',
          '${a['status_label']}\n${a['meeting_type_label']} · ${a['duration_minutes']} minutes\n${a['location']}',
        ),
        ReadingSection(
          'Interlocuteur',
          [
            a['contact_name'],
            a['contact_role'],
          ].where((s) => s != null && '$s'.isNotEmpty).join(' · '),
        ),
        ReadingSection('Objectif', readableValue(a['objective'])),
        if (_error.isNotEmpty) ReadingSection('Chargement interrompu', _error),
        if (_preparation == null && _error.isEmpty)
          const LinearProgressIndicator(color: mobilePrimary),
        if (_preparation != null) ...[
          ReadingSection(
            'Préparation · ${_preparation!['visit_purpose_label']}',
            readableValue(_preparation!['purpose_reason']),
          ),
          for (final fact in [
            ...?_preparation!['account_facts'] as List?,
            ...?_preparation!['visit_facts'] as List?,
          ])
            ReadingSection(
              '${fact['label']}',
              '${fact['value']}\nSource : ${fact['source']}',
            ),
          ReadingSection(
            'Questions à confirmer',
            readableValue(_preparation!['questions_to_confirm']),
          ),
        ],
        if ('${a['meet_url'] ?? ''}'.isNotEmpty)
          TextButton(
            onPressed: () => launchUrl(
              Uri.parse('${a['meet_url']}'),
              mode: LaunchMode.externalApplication,
            ),
            child: const Text('Ouvrir la visioconférence'),
          ),
        if (!completed && !cancelled) ...[
          TextButton(
            onPressed: () async {
              await Get.to(() => KamAppointmentForm(existing: a));
              await _load();
            },
            child: const Text('Modifier le rendez-vous'),
          ),
          TextButton(
            onPressed: _cancel,
            child: const Text('Annuler le rendez-vous'),
          ),
        ],
      ],
    );
  }

  Future<void> _cancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Annuler ce rendez-vous ?'),
        content: const Text(
          'Il restera visible dans votre agenda avec le statut annulé.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Conserver'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Annuler le rendez-vous'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await workspace().api.patch(
        '/api/kam/appointments/${_appointment['id']}/',
        body: {'status': 'CANCELLED'},
      );
      await _load();
      await workspace().reload();
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    }
  }
}
