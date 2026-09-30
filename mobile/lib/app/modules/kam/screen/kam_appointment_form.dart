import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/kam_workspace_controller.dart';
import '../../../common/screen/widget/mobile_page.dart';
import 'kam_screen_helpers.dart';
import 'kam_appointment_page.dart';
import 'kam_meeting_page.dart';

class KamAppointmentForm extends StatefulWidget {
  const KamAppointmentForm({
    super.key,
    this.account,
    this.express = false,
    this.existing,
  });
  final KamData? account, existing;
  final bool express;
  @override
  State<KamAppointmentForm> createState() => _KamAppointmentFormState();
}

class _KamAppointmentFormState extends State<KamAppointmentForm> {
  final _form = GlobalKey<FormState>();
  final _title = TextEditingController(),
      _objective = TextEditingController(),
      _location = TextEditingController(),
      _contact = TextEditingController(),
      _role = TextEditingController(),
      _url = TextEditingController();
  int? _account;
  String _format = 'PHYSICAL', _purpose = 'DISCOVERY', _error = '';
  DateTime _date = DateTime.now().add(const Duration(days: 1));
  int _duration = 45;
  bool _busy = false;
  @override
  void initState() {
    super.initState();
    final a = widget.account;
    _account = a == null
        ? (widget.existing?['enterprise_id'] as int?)
        : accountId(a);
    _location.text = '${a?['location'] ?? ''}';
    _contact.text = '${a?['contact_name'] ?? ''}';
    _role.text = '${a?['contact_role'] ?? ''}';
    final old = widget.existing;
    if (old != null) {
      _title.text = '${old['title']}';
      _objective.text = '${old['objective'] ?? ''}';
      _location.text = '${old['location'] ?? ''}';
      _contact.text = '${old['contact_name'] ?? ''}';
      _role.text = '${old['contact_role'] ?? ''}';
      _url.text = '${old['meet_url'] ?? ''}';
      _format = '${old['meeting_type']}';
      _purpose = '${old['visit_purpose'] ?? 'DISCOVERY'}';
      _date = DateTime.parse('${old['scheduled_at']}').toLocal();
      _duration = old['duration_minutes'] as int? ?? 45;
    }
  }

  @override
  void dispose() {
    for (final c in [_title, _objective, _location, _contact, _role, _url]) {
      c.dispose();
    }
    super.dispose();
  }

  Widget field(
    String label,
    TextEditingController c, {
    bool required = false,
    int lines = 1,
  }) => spacedField(
    TextFormField(
      controller: c,
      maxLines: lines,
      decoration: InputDecoration(labelText: label),
      validator: required
          ? (s) => s == null || s.trim().isEmpty ? 'Champ requis' : null
          : null,
    ),
  );
  @override
  Widget build(BuildContext context) => MobilePage(
    title: widget.existing != null
        ? 'Modifier le rendez-vous'
        : widget.express
        ? 'Réunion express'
        : 'Nouveau rendez-vous',
    subtitle: 'Un objectif clair pour préparer votre échange.',
    primaryLabel: widget.existing != null
        ? 'Enregistrer'
        : widget.express
        ? 'Démarrer la réunion'
        : 'Planifier',
    onPrimary: _submit,
    busy: _busy,
    children: [
      Form(
        key: _form,
        child: Column(
          children: [
            spacedField(
              DropdownButtonFormField<int>(
                initialValue: _account,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Compte client'),
                items: workspace().accounts
                    .map(
                      (a) => DropdownMenuItem(
                        value: accountId(a),
                        child: Text(
                          '${a['account_name']}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                validator: (v) => v == null ? 'Sélectionnez un compte' : null,
                onChanged: widget.existing == null
                    ? (v) => setState(() => _account = v)
                    : null,
              ),
            ),
            field('Objet du rendez-vous', _title, required: !widget.express),
            spacedField(
              DropdownButtonFormField<String>(
                initialValue: _format,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Format'),
                items:
                    {
                          'PHYSICAL': 'Visite sur place',
                          'GOOGLE_MEET': 'Visioconférence',
                          'CALL': 'Appel',
                        }.entries
                        .map(
                          (e) => DropdownMenuItem(
                            value: e.key,
                            child: Text(e.value),
                          ),
                        )
                        .toList(),
                onChanged: (v) => setState(() => _format = v!),
              ),
            ),
            spacedField(
              DropdownButtonFormField<String>(
                initialValue: _purpose,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Type de visite'),
                items:
                    {
                          'DISCOVERY': 'Découverte',
                          'QUALIFICATION': 'Qualification',
                          'FOLLOW_UP': 'Suivi client',
                          'GROWTH': 'Renouvellement / Développement',
                        }.entries
                        .map(
                          (e) => DropdownMenuItem(
                            value: e.key,
                            child: Text(e.value),
                          ),
                        )
                        .toList(),
                onChanged: (v) => setState(() => _purpose = v!),
              ),
            ),
            if (!widget.express) ...[
              spacedField(
                TextButton(
                  onPressed: _pickDate,
                  child: Text(
                    'Date et heure : ${dateLabel(_date.toIso8601String())}',
                  ),
                ),
              ),
              spacedField(
                DropdownButtonFormField<int>(
                  initialValue: _duration,
                  decoration: const InputDecoration(labelText: 'Durée'),
                  items:
                      {
                            ...[15, 30, 45, 60, 90, 120],
                            _duration,
                          }
                          .map(
                            (v) => DropdownMenuItem(
                              value: v,
                              child: Text('$v minutes'),
                            ),
                          )
                          .toList(),
                  onChanged: (v) => setState(() => _duration = v!),
                ),
              ),
            ],
            field('Lieu', _location),
            if (_format == 'GOOGLE_MEET')
              field('Lien de visioconférence', _url),
            field('Nom du contact', _contact),
            field('Fonction', _role),
            field('Objectif', _objective, lines: 3),
          ],
        ),
      ),
      if (_error.isNotEmpty)
        ReadingSection('Enregistrement interrompu', _error),
    ],
  );
  Future<void> _pickDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_date),
    );
    if (time != null && mounted) {
      setState(
        () => _date = DateTime(
          date.year,
          date.month,
          date.day,
          time.hour,
          time.minute,
        ),
      );
    }
  }

  Future<void> _submit() async {
    if (_busy || !_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      final body = <String, dynamic>{
        'enterprise_id': _account,
        'title': _title.text.trim(),
        'meeting_type': _format,
        'visit_purpose': _purpose,
        'scheduled_at': _date.toUtc().toIso8601String(),
        'duration_minutes': _duration,
        'location': _location.text.trim(),
        'meet_url': _url.text.trim(),
        'contact_name': _contact.text.trim(),
        'contact_role': _role.text.trim(),
        'objective': _objective.text.trim(),
        'start_immediately': widget.express,
      };
      final KamData a;
      if (widget.existing != null) {
        a = KamData.from(
          await workspace().api.patch(
                '/api/kam/appointments/${widget.existing!['id']}/',
                body: body,
              )
              as Map,
        );
        await workspace().reload();
      } else {
        a = await workspace().createAppointment(body);
      }
      if (mounted) {
        Get.off(
          () => widget.express
              ? KamMeetingPage(appointment: a)
              : KamAppointmentPage(appointment: a),
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}
