import 'package:flutter/material.dart';

import '../data/kam_repository.dart';
import 'kam_meeting_report_screen.dart';
import 'kam_workspace_screen.dart';
import 'widget/kam_workspace_widgets.dart';

const kamVisitPurposes = {
  'DISCOVERY': 'Prospection / Découverte',
  'QUALIFICATION': 'Qualification / Proposition',
  'FOLLOW_UP': 'Suivi / Revue client',
  'GROWTH': 'Renouvellement / Développement',
};

class KamAppointmentScreen extends StatefulWidget {
  final int? accountId;
  const KamAppointmentScreen({super.key, this.accountId});
  @override
  State<KamAppointmentScreen> createState() => _KamAppointmentScreenState();
}

class _KamAppointmentScreenState extends State<KamAppointmentScreen> {
  final repo = kamRepository();
  final form = GlobalKey<FormState>();
  final title = TextEditingController();
  final location = TextEditingController();
  final contact = TextEditingController();
  final role = TextEditingController();
  final objective = TextEditingController();
  int? accountId;
  int duration = 45;
  String? purpose;
  String suggestion = '';
  String? error;
  bool saving = false;
  bool loadingPurpose = false;
  int requestId = 0;
  DateTime scheduled = DateTime.now().add(const Duration(hours: 1));

  @override
  void initState() {
    super.initState();
    accountId = widget.accountId;
    if (accountId != null) _suggest(accountId!);
  }

  @override
  void dispose() {
    for (final c in [title, location, contact, role, objective]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _suggest(int id) async {
    final request = ++requestId;
    setState(() {
      loadingPurpose = true;
      purpose = null;
      error = null;
    });
    try {
      final data = KamRepository.record(
        await repo.read(
          'appointments/purpose-suggestion',
          query: {'enterprise_id': id},
        ),
      );
      if (mounted && request == requestId) {
        setState(() {
          purpose = data['suggested_purpose']?.toString();
          suggestion = data['reason']?.toString() ?? '';
        });
      }
    } catch (_) {
      if (mounted && request == requestId) {
        setState(
          () => error =
              'La suggestion est indisponible. Choisissez le type de visite pour continuer.',
        );
      }
    } finally {
      if (mounted && request == requestId) {
        setState(() => loadingPurpose = false);
      }
    }
  }

  Future<void> _pickDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: scheduled,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(scheduled),
    );
    if (time != null && mounted) {
      setState(
        () => scheduled = DateTime(
          date.year,
          date.month,
          date.day,
          time.hour,
          time.minute,
        ),
      );
    }
  }

  Future<void> _save() async {
    if (!form.currentState!.validate() ||
        accountId == null ||
        purpose == null ||
        saving) {
      return;
    }
    setState(() {
      saving = true;
      error = null;
    });
    try {
      await repo.write('appointments', {
        'enterprise_id': accountId,
        'title': title.text.trim(),
        'meeting_type': 'PHYSICAL',
        'scheduled_at': scheduled.toUtc().toIso8601String(),
        'duration_minutes': duration,
        'location': location.text.trim(),
        'contact_name': contact.text.trim(),
        'contact_role': role.text.trim(),
        'objective': objective.text.trim(),
        'visit_purpose': purpose,
      });
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Rendez-vous créé.')));
        Navigator.of(context).pop(true);
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Le rendez-vous n’a pas été enregistré. Vérifiez les champs et réessayez.',
        );
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Nouveau rendez-vous')),
    body: SafeArea(
      child: KamAsyncView(
        load: () => repo.read('accounts'),
        builder: (data) {
          final accounts = KamRepository.records(data, 'accounts');
          return Form(
            key: form,
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                DropdownButtonFormField<int>(
                  initialValue:
                      accounts.any(
                        (a) => KamRepository.accountId(a) == accountId,
                      )
                      ? accountId
                      : null,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Entreprise *'),
                  items: [
                    for (final a in accounts)
                      DropdownMenuItem(
                        value: KamRepository.accountId(a),
                        child: Text(
                          a['account_name']?.toString() ?? '',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                  validator: (v) =>
                      v == null ? 'Choisissez une entreprise.' : null,
                  onChanged: saving
                      ? null
                      : (v) {
                          if (v != null) {
                            setState(() => accountId = v);
                            final a = accounts.firstWhere(
                              (a) => KamRepository.accountId(a) == v,
                            );
                            contact.text = a['contact_name']?.toString() ?? '';
                            role.text = a['contact_role']?.toString() ?? '';
                            location.text = a['location']?.toString() ?? '';
                            _suggest(v);
                          }
                        },
                ),
                const SizedBox(height: 16),
                if (loadingPurpose) const Text('Recherche du type de visite…'),
                DropdownButtonFormField<String>(
                  key: ValueKey('$accountId-$purpose'),
                  initialValue: purpose,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Type de visite *',
                  ),
                  items: [
                    for (final e in kamVisitPurposes.entries)
                      DropdownMenuItem(value: e.key, child: Text(e.value)),
                  ],
                  validator: (v) =>
                      v == null ? 'Choisissez un type de visite.' : null,
                  onChanged: loadingPurpose || saving
                      ? null
                      : (v) => setState(() => purpose = v),
                ),
                if (suggestion.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(suggestion),
                  ),
                _field(title, 'Objet *', required: true),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Date et heure *'),
                  subtitle: Text(
                    '${scheduled.day}/${scheduled.month}/${scheduled.year} · ${TimeOfDay.fromDateTime(scheduled).format(context)}',
                  ),
                  trailing: const Icon(Icons.calendar_today_outlined),
                  onTap: saving ? null : _pickDate,
                ),
                DropdownButtonFormField<int>(
                  initialValue: duration,
                  decoration: const InputDecoration(labelText: 'Durée'),
                  items: [
                    for (final n in [15, 30, 45, 60, 90, 120])
                      DropdownMenuItem(value: n, child: Text('$n minutes')),
                  ],
                  onChanged: saving
                      ? null
                      : (v) => setState(() => duration = v!),
                ),
                _field(location, 'Lieu'),
                _field(contact, 'Contact'),
                _field(role, 'Fonction'),
                _field(objective, 'Objectif', lines: 3),
                if (error != null)
                  Text(
                    error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: saving || loadingPurpose ? null : _save,
                  child: Text(
                    saving ? 'Enregistrement…' : 'Créer le rendez-vous',
                  ),
                ),
              ],
            ),
          );
        },
      ),
    ),
  );
  Widget _field(
    TextEditingController c,
    String label, {
    bool required = false,
    int lines = 1,
  }) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: TextFormField(
      controller: c,
      maxLines: lines,
      enabled: !saving,
      decoration: InputDecoration(labelText: label),
      validator: (v) => required && (v == null || v.trim().isEmpty)
          ? 'Ce champ est requis.'
          : null,
    ),
  );
}

class KamAppointmentDetailScreen extends StatefulWidget {
  final KamRecord appointment;
  const KamAppointmentDetailScreen({super.key, required this.appointment});
  @override
  State<KamAppointmentDetailScreen> createState() =>
      _KamAppointmentDetailScreenState();
}

class _KamAppointmentDetailScreenState
    extends State<KamAppointmentDetailScreen> {
  final key = GlobalKey<KamAsyncViewState>();
  Future<void> open(Widget screen) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
    key.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        widget.appointment['enterprise_name']?.toString() ?? 'Rendez-vous',
      ),
    ),
    body: KamAsyncView(
      key: key,
      load: () =>
          kamRepository().read('appointments/${widget.appointment['id']}'),
      builder: (raw) {
        final appointment = {
          ...widget.appointment,
          ...KamRepository.record(raw),
        };
        return ListView(
          padding: const EdgeInsets.all(24),
          children: [
            KamDocument(data: appointment),
            FilledButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => KamDataScreen(
                    title: 'Préparer la visite',
                    resource: 'appointments/${appointment['id']}/preparation',
                  ),
                ),
              ),
              icon: const Icon(Icons.description_outlined),
              label: const Text('Préparer la visite'),
            ),
            if (appointment['status'] != 'COMPLETED')
              TextButton.icon(
                onPressed: () =>
                    open(KamMeetingScreen(appointment: appointment)),
                icon: const Icon(Icons.description_outlined),
                label: const Text('Préparer le compte rendu'),
              ),
            if (appointment['report_id'] != null)
              TextButton.icon(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => KamDataScreen(
                      title: 'Rapport de visite',
                      resource: 'visits/${appointment['report_id']}',
                      report: true,
                    ),
                  ),
                ),
                icon: const Icon(Icons.article_outlined),
                label: const Text('Consulter le rapport'),
              ),
          ],
        );
      },
    ),
  );
}

/// The meeting report is prepared from existing commercial notes and documents.
class KamMeetingScreen extends StatelessWidget {
  final KamRecord? appointment;
  final int? accountId;
  const KamMeetingScreen({super.key, this.appointment, this.accountId});
  @override
  Widget build(BuildContext context) =>
      KamMeetingReportScreen(appointment: appointment, accountId: accountId);
}
