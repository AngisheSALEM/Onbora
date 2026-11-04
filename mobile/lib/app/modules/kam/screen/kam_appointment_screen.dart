import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import '../../../common/screen/widget/skeleton_loader.dart';
import '../data/kam_repository.dart';
import '../data/kam_meeting_draft.dart';
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
  final meetUrl = TextEditingController();
  int? accountId;
  int duration = 45;
  String type = 'PHYSICAL';
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
    for (final c in [title, location, contact, role, objective, meetUrl]) {
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
        'meeting_type': type,
        'scheduled_at': scheduled.toUtc().toIso8601String(),
        'duration_minutes': duration,
        'location': location.text.trim(),
        'meet_url': meetUrl.text.trim(),
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
                DropdownButtonFormField<String>(
                  initialValue: type,
                  decoration: const InputDecoration(labelText: 'Format'),
                  items: const [
                    DropdownMenuItem(
                      value: 'PHYSICAL',
                      child: Text('Présentiel'),
                    ),
                    DropdownMenuItem(
                      value: 'GOOGLE_MEET',
                      child: Text('Google Meet'),
                    ),
                    DropdownMenuItem(value: 'CALL', child: Text('Appel')),
                  ],
                  onChanged: saving ? null : (v) => setState(() => type = v!),
                ),
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
                if (type == 'GOOGLE_MEET') _field(meetUrl, 'Lien Google Meet'),
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
                icon: const Icon(Icons.mic_none),
                label: const Text('Visite vocale et notes'),
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

/// Voice and manual notes stay separate until the backend combines both channels.
class KamMeetingScreen extends StatefulWidget {
  final KamRecord? appointment;
  final int? accountId;
  const KamMeetingScreen({super.key, this.appointment, this.accountId});
  @override
  State<KamMeetingScreen> createState() => _KamMeetingScreenState();
}

class _KamMeetingScreenState extends State<KamMeetingScreen> {
  final speech = SpeechToText();
  AudioRecorder? _recorder;
  AudioRecorder get recorder => _recorder ??= AudioRecorder();
  final voice = TextEditingController();
  final notes = TextEditingController();
  final repo = kamRepository();
  String status = 'IN_NEGOTIATION';
  String? error;
  bool listening = false;
  bool processing = false;
  bool completed = false;
  bool recording = false;
  bool transcribing = false;
  bool audioChanging = false;
  String? audioPath;
  int seconds = 0;
  Timer? timer;
  String prefix = '';
  KamMeetingDraft? draft;
  Timer? draftTimer;
  Future<void> draftQueue = Future.value();
  @override
  void initState() {
    super.initState();
    voice.addListener(_scheduleDraft);
    notes.addListener(_scheduleDraft);
    _restoreDraft();
  }

  Future<void> _restoreDraft() async {
    try {
      draft = await KamMeetingDraft.open(
        widget.appointment != null
            ? 'appointment:${widget.appointment!['id']}'
            : 'account:${widget.accountId}',
      );
      final saved = await draft?.read() ?? {};
      if (!mounted || voice.text.isNotEmpty || notes.text.isNotEmpty) return;
      voice.text = saved['voice']?.toString() ?? '';
      notes.text = saved['notes']?.toString() ?? '';
      final path = saved['audio_path']?.toString();
      if (path != null) {
        final directory = await getTemporaryDirectory();
        if (!mounted) return;
        if (path.startsWith('${directory.path}/onbora_kam_') &&
            RegExp(r'/onbora_kam_\d+\.m4a$').hasMatch(path) &&
            await File(path).exists()) {
          audioPath = path;
        }
      }
      if (mounted) {
        setState(
          () => status =
              [
                'PROSPECT',
                'IN_NEGOTIATION',
                'CONVERTED',
                'LOST',
              ].contains(saved['status'])
              ? saved['status']
              : status,
        );
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Le brouillon n’a pas pu être restauré. Vérifiez vos notes avant de continuer.',
        );
      }
    }
  }

  void _scheduleDraft() {
    draftTimer?.cancel();
    draftTimer = Timer(const Duration(milliseconds: 400), _saveDraft);
  }

  void _saveDraft() {
    if (draft == null || completed) return;
    final value = {
      'voice': voice.text,
      'notes': notes.text,
      'status': status,
      'audio_path': audioPath,
    };
    draftQueue = draftQueue.then((_) => draft!.save(value)).catchError((
      Object _,
    ) {
      if (mounted) {
        setState(
          () => error =
              'Le brouillon ne peut pas être sauvegardé sur cet appareil. Gardez cet écran ouvert.',
        );
      }
    });
  }

  @override
  void dispose() {
    timer?.cancel();
    draftTimer?.cancel();
    _saveDraft();
    speech.cancel();
    _recorder?.dispose();
    voice.dispose();
    notes.dispose();
    super.dispose();
  }

  Future<void> _record() async {
    if (transcribing || processing || audioChanging) return;
    setState(() => audioChanging = true);
    try {
      if (!recording) {
        await speech.stop();
        if (!await recorder.hasPermission()) {
          if (mounted) {
            setState(
              () =>
                  error = 'Autorisez le microphone pour enregistrer la visite.',
            );
          }
          return;
        }
        final directory = await getTemporaryDirectory();
        audioPath =
            '${directory.path}/onbora_kam_${DateTime.now().microsecondsSinceEpoch}.m4a';
        await recorder.start(
          const RecordConfig(encoder: AudioEncoder.aacLc),
          path: audioPath!,
        );
        if (!mounted) {
          await recorder.cancel();
          return;
        }
        setState(() {
          recording = true;
          listening = false;
          seconds = 0;
          error = null;
        });
        timer = Timer.periodic(const Duration(seconds: 1), (_) {
          if (mounted) setState(() => seconds++);
        });
        return;
      }
      timer?.cancel();
      final path = await recorder.stop();
      if (path != null) audioPath = path;
      _saveDraft();
      if (!mounted) return;
      setState(() {
        recording = false;
        transcribing = true;
      });
      await _transcribe();
    } catch (_) {
      timer?.cancel();
      if (mounted) {
        setState(() {
          recording = false;
          transcribing = false;
          error =
              'L’enregistrement n’a pas pu être transcrit. Réessayez la transcription ou complétez vos notes.';
        });
      }
    } finally {
      if (mounted) setState(() => audioChanging = false);
    }
  }

  Future<void> _transcribe() async {
    if (audioPath == null) return;
    setState(() {
      transcribing = true;
      error = null;
    });
    try {
      final data = KamRepository.record(
        await repo.api.uploadAudio('/api/kam/transcribe/', audioPath!),
      );
      final transcript = data['transcript']?.toString().trim() ?? '';
      if (transcript.isEmpty) {
        throw const FormatException('Aucune voix reconnue');
      }
      if (!mounted) return;
      voice.text = [
        voice.text.trim(),
        transcript,
      ].where((v) => v.isNotEmpty).join('\n');
      final file = File(audioPath!);
      audioPath = null;
      _saveDraft();
      if (await file.exists()) await file.delete();
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Transcription indisponible. L’audio est conservé pour réessayer.',
        );
      }
    } finally {
      if (mounted) setState(() => transcribing = false);
    }
  }

  Future<void> _listen() async {
    if (listening) {
      await speech.stop();
      if (mounted) setState(() => listening = false);
      return;
    }
    try {
      final ready = await speech.initialize(
        onStatus: (s) {
          if (mounted && (s == 'done' || s == 'notListening')) {
            setState(() => listening = false);
          }
        },
        onError: (_) {
          if (mounted) {
            setState(() {
              listening = false;
              error =
                  'La dictée s’est interrompue. Relancez-la ou complétez vos notes.';
            });
          }
        },
      );
      if (!mounted) return;
      if (!ready) {
        setState(
          () => error =
              'La dictée est indisponible. Autorisez le microphone ou saisissez vos notes.',
        );
        return;
      }
      prefix = voice.text.trim();
      setState(() {
        listening = true;
        error = null;
      });
      await speech.listen(
        listenOptions: SpeechListenOptions(localeId: 'fr_FR'),
        onResult: (r) {
          if (mounted) {
            setState(
              () => voice.text = [
                prefix,
                r.recognizedWords,
              ].where((s) => s.isNotEmpty).join(' '),
            );
          }
        },
      );
    } catch (_) {
      if (mounted) {
        setState(() {
          listening = false;
          error =
              'Le microphone est indisponible. Réessayez ou écrivez vos notes.';
        });
      }
    }
  }

  Future<void> _finish() async {
    if (processing || completed || recording || transcribing || audioChanging) {
      return;
    }
    if (voice.text.trim().isEmpty && notes.text.trim().isEmpty) {
      setState(
        () => error =
            'Enregistrez votre voix ou saisissez vos notes avant de finaliser.',
      );
      return;
    }
    setState(() {
      processing = true;
      listening = false;
      error = null;
    });
    try {
      await speech.stop();
      final dynamic result;
      if (widget.appointment != null) {
        result = await repo
            .write('appointments/${widget.appointment!['id']}/complete-vocal', {
              'transcript': voice.text.trim(),
              'notes': notes.text.trim(),
              'conversion_status': status,
            });
      } else {
        result = await repo.write('accounts/${widget.accountId}/debrief', {
          'generate_ai': true,
          'transcript': voice.text.trim(),
          'notes': notes.text.trim(),
          'conversion_status': status,
        });
      }
      if (!mounted) return;
      final data = KamRepository.record(result);
      final report = KamRepository.record(data['report'] ?? data['debrief']);
      if (report.isEmpty) throw const FormatException('Rapport absent');
      setState(() => completed = true);
      draftTimer?.cancel();
      try {
        await draftQueue;
        await draft?.clear();
      } catch (_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Rapport enregistré. Le brouillon local n’a pas pu être effacé.',
              ),
            ),
          );
        }
      }
      if (!mounted) return;
      await Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => KamDataScreen(
            title: 'Compte-rendu',
            initial: report,
            resource: data['report'] != null ? 'visits/${report['id']}' : null,
            report: data['report'] != null,
          ),
        ),
      );
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Le compte-rendu n’a pas pu être confirmé. Vos notes sont conservées ici. Consultez l’historique avant de réessayer.',
        );
      }
    } finally {
      if (mounted) setState(() => processing = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !processing && !recording && !transcribing,
    child: Scaffold(
      appBar: AppBar(title: const Text('Visite vocale')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          if (processing)
            const KamSurface(
              child: Column(
                children: [
                  Text('Préparation du compte-rendu…'), SizedBox(height: 16),
                  // The document skeleton preserves the structure of the generated report.
                  _ReportSkeleton(),
                ],
              ),
            )
          else ...[
            FilledButton.icon(
              onPressed: transcribing ? null : _record,
              icon: Icon(recording ? Icons.stop : Icons.mic),
              label: Text(
                recording
                    ? 'Arrêter · ${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}'
                    : 'Enregistrer la visite',
              ),
            ),
            if (transcribing)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: _ReportSkeleton(),
              ),
            if (audioPath != null && !recording && !transcribing)
              TextButton(
                onPressed: _transcribe,
                child: const Text('Réessayer la transcription'),
              ),
            TextButton.icon(
              onPressed: recording || transcribing ? null : _listen,
              icon: Icon(listening ? Icons.stop : Icons.mic_none),
              label: Text(listening ? 'Arrêter la dictée' : 'Dicter la visite'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: voice,
              minLines: 4,
              maxLines: 12,
              readOnly: listening,
              decoration: const InputDecoration(
                labelText: 'Transcription vocale',
              ),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: notes,
              minLines: 4,
              maxLines: 12,
              decoration: const InputDecoration(
                labelText: 'Notes et observations',
              ),
            ),
            const SizedBox(height: 24),
            DropdownButtonFormField<String>(
              initialValue: status,
              decoration: const InputDecoration(labelText: 'Statut commercial'),
              items: [
                for (final s in [
                  'PROSPECT',
                  'IN_NEGOTIATION',
                  'CONVERTED',
                  'LOST',
                ])
                  DropdownMenuItem(value: s, child: Text(kamText(s))),
              ],
              onChanged: (v) {
                setState(() => status = v!);
                _scheduleDraft();
              },
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: recording || transcribing ? null : _finish,
              child: const Text('Générer le compte-rendu'),
            ),
          ],
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Text(error!),
            ),
        ],
      ),
    ),
  );
}

class _ReportSkeleton extends StatelessWidget {
  const _ReportSkeleton();
  @override
  Widget build(BuildContext context) => const Column(
    children: [
      SkeletonBox(height: 26),
      SizedBox(height: 16),
      SkeletonBox(height: 80),
      SizedBox(height: 16),
      SkeletonBox(height: 80),
    ],
  );
}
