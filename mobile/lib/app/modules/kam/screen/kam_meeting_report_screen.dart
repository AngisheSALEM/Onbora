import 'dart:async';
import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/skeleton_loader.dart';
import '../data/kam_meeting_draft.dart';
import '../data/kam_repository.dart';
import 'kam_workspace_screen.dart';

class KamMeetingReportScreen extends StatefulWidget {
  final KamRecord? appointment;
  final int? accountId;
  const KamMeetingReportScreen({super.key, this.appointment, this.accountId});
  @override
  State<KamMeetingReportScreen> createState() => _KamMeetingReportScreenState();
}

class _KamMeetingReportScreenState extends State<KamMeetingReportScreen> {
  final repo = kamRepository();
  final scroll = ScrollController(keepScrollOffset: false);
  final notes = TextEditingController();
  final document = TextEditingController();
  final action = TextEditingController();
  final owner = TextEditingController();
  final summary = TextEditingController();
  final needs = TextEditingController();
  final objections = TextEditingController();
  final actions = TextEditingController();
  final email = TextEditingController();
  String sourceType = 'NOTES';
  String documentName = '';
  String token = '';
  KamRecord insights = {};
  String? dueDate;
  String? error;
  bool busy = false;
  bool reviewing = false;
  bool saved = false;
  bool restored = false;
  KamMeetingDraft? draft;
  Timer? debounce;
  Future<void> draftQueue = Future.value();
  String get resource => widget.appointment != null
      ? 'appointments/${widget.appointment!['id']}'
      : 'accounts/${widget.accountId}';
  List<TextEditingController> get sourceControllers => [
    notes,
    document,
    action,
    owner,
  ];
  KamRecord get source => {
    'notes': notes.text,
    'source_type': sourceType,
    'document_text': document.text,
    'document_name': documentName,
    'next_action': action.text,
    'owner': owner.text,
    'due_date': dueDate,
  };

  @override
  void initState() {
    super.initState();
    for (final c in sourceControllers) {
      c.addListener(_changed);
    }
    _restore();
  }

  Future<void> _restore() async {
    try {
      draft = await KamMeetingDraft.open(
        widget.appointment != null
            ? 'appointment:${widget.appointment!['id']}'
            : 'account:${widget.accountId}',
      );
      final data = await draft?.read() ?? {};
      if (!mounted) return;
      notes.text = [
        data['notes'],
        data['voice'],
      ].whereType<String>().where((s) => s.isNotEmpty).join('\n\n');
      document.text = data['document_text']?.toString() ?? '';
      action.text = data['next_action']?.toString() ?? '';
      owner.text = data['owner']?.toString() ?? '';
      documentName = data['document_name']?.toString() ?? '';
      sourceType =
          const [
            'NOTES',
            'MESSAGE',
            'PROPOSAL',
            'TECHNICAL',
          ].contains(data['source_type'])
          ? data['source_type']
          : 'NOTES';
      dueDate = data['due_date']?.toString();
    } catch (_) {
      error =
          'Le brouillon local ne peut pas être restauré. Vérifiez vos notes.';
    } finally {
      if (mounted) setState(() => restored = true);
    }
  }

  void _changed() {
    if (!mounted || !restored) return;
    setState(() {});
    debounce?.cancel();
    debounce = Timer(const Duration(milliseconds: 400), _saveDraft);
  }

  void _saveDraft() {
    if (!restored || saved || draft == null) return;
    final value = source;
    draftQueue = draftQueue.then((_) => draft!.save(value)).catchError((
      Object _,
    ) {
      if (mounted) {
        setState(
          () => error =
              'Le brouillon ne peut pas être sauvegardé. Gardez cet écran ouvert.',
        );
      }
    });
  }

  Future<void> _document() async {
    try {
      final file = await openFile(
        acceptedTypeGroups: [
          const XTypeGroup(
            label: 'Documents',
            extensions: ['pdf', 'docx', 'txt', 'md', 'csv'],
            uniformTypeIdentifiers: ['public.data'],
          ),
        ],
      );
      if (file == null || !mounted) return;
      if (await file.length() > 5 * 1024 * 1024) {
        if (mounted) {
          setState(
            () => error =
                'Le document dépasse 5 Mo. Choisissez un fichier plus léger.',
          );
        }
        return;
      }
      if (!mounted) return;
      setState(() {
        busy = true;
        error = null;
      });
      final data = KamRepository.record(
        await repo.api.uploadDocument(
          '/api/kam/$resource/report-document/',
          file.name,
          await file.readAsBytes(),
        ),
      );
      if (!mounted) return;
      documentName = data['name'].toString();
      document.text = data['text'].toString();
      _saveDraft();
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Ce document ne peut pas être lu. Copiez les passages utiles dans les notes.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _prepare() async {
    if (busy) return;
    if (action.text.trim().isEmpty &&
        (owner.text.trim().isNotEmpty || dueDate != null)) {
      setState(
        () => error =
            'Précisez l’action associée au responsable ou à l’échéance.',
      );
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final response = KamRepository.record(
        await repo.write('$resource/report-draft', source),
      );
      final result = KamRepository.record(response['draft']);
      if (!mounted) return;
      summary.text = result['executive_summary']?.toString() ?? '';
      needs.text = (result['confirmed_needs'] as List? ?? []).join('\n');
      objections.text = (result['objections_raised'] as List? ?? []).join('\n');
      actions.text = (result['actions_todo'] as List? ?? []).join('\n');
      email.text = result['follow_up_email_draft']?.toString() ?? '';
      token = response['draft_token'].toString();
      insights = KamRepository.record(response['insights']);
      setState(() => reviewing = true);
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Le compte rendu n’a pas pu être préparé. Vérifiez votre connexion et réessayez.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  List<String> _lines(TextEditingController c) => c.text
      .split('\n')
      .map((s) => s.trim())
      .where((s) => s.isNotEmpty)
      .toList();

  Future<void> _save() async {
    if (busy || summary.text.trim().isEmpty) return;
    FocusScope.of(context).unfocus();
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = KamRepository.record(
        await repo.write('$resource/report-complete', {
          'draft_token': token,
          'executive_summary': summary.text,
          'confirmed_needs': _lines(needs),
          'objections_raised': _lines(objections),
          'actions_todo': _lines(actions),
          'follow_up_email_draft': email.text,
        }),
      );
      if (!mounted) return;
      final report = KamRepository.record(result['report']);
      if (report['id'] == null) throw const FormatException('Rapport absent');
      saved = true;
      debounce?.cancel();
      try {
        await draftQueue;
        await draft?.clear();
      } catch (_) {
        /* Report already persisted. */
      }
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => KamDataScreen(
            title: 'Compte rendu',
            initial: report,
            report: true,
          ),
        ),
      );
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Le compte rendu n’a pas pu être enregistré. Réessayez ou revenez aux notes pour préparer un nouveau brouillon.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Widget _card(List<Widget> children) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: dark ? AppConstants.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }

  Widget _field(
    String label,
    TextEditingController controller, {
    int lines = 1,
    int limit = 30000,
  }) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: TextField(
        controller: controller,
        minLines: lines,
        maxLines: lines == 1 ? 1 : 12,
        maxLength: limit,
        style: const TextStyle(fontSize: 14, height: 1.57),
        decoration: InputDecoration(
          labelText: label,
          alignLabelWithHint: true,
          counterText: '',
          filled: true,
          fillColor: dark ? AppConstants.cardDark : Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(lines == 1 ? 28 : 16),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(lines == 1 ? 28 : 16),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Compte rendu', style: TextStyle(fontSize: 21)),
      elevation: 0,
      scrolledUnderElevation: 0,
    ),
    body: !restored || busy
        ? const SingleChildScrollView(
            padding: EdgeInsets.all(24),
            child: Column(
              children: [
                SkeletonBox(height: 26),
                SizedBox(height: 24),
                SkeletonBox(height: 160),
                SizedBox(height: 24),
                SkeletonBox(height: 80),
              ],
            ),
          )
        : ListView(
            key: ValueKey((reviewing, error)),
            controller: scroll,
            padding: const EdgeInsets.all(24),
            children: [
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 24),
                  child: Text(
                    error!,
                    style: const TextStyle(fontSize: 13, height: 1.618),
                  ),
                ),
              if (reviewing) ...[
                const Text(
                  'Relire avant d’enregistrer',
                  style: TextStyle(fontSize: 21, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 24),
                _card([_field('Synthèse', summary, lines: 5)]),
                _card([
                  _field('Besoins confirmés · un par ligne', needs, lines: 2),
                ]),
                _field(
                  'Objections et blocages · un par ligne',
                  objections,
                  lines: 2,
                ),
                _field('Prochaines actions · une par ligne', actions, lines: 2),
                for (final entry in {
                  'proposed_scope': 'Périmètre proposé',
                  'decisions': 'Décisions relevées',
                  'clarification_questions': 'À clarifier pour la suite',
                }.entries)
                  if ((insights[entry.key] as List? ?? []).isNotEmpty)
                    _card([
                      Text(
                        entry.value,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      for (final point in insights[entry.key] as List)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(
                            point.toString(),
                            style: const TextStyle(fontSize: 13, height: 1.618),
                          ),
                        ),
                    ]),
                ExpansionTile(
                  title: const Text(
                    'Relire l’email de suivi',
                    style: TextStyle(fontSize: 14),
                  ),
                  shape: const Border(),
                  collapsedShape: const Border(),
                  children: [_field('Email de suivi', email, lines: 6)],
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _save,
                  child: const Text('Valider et enregistrer'),
                ),
                TextButton(
                  onPressed: () => setState(() {
                    reviewing = false;
                    error = null;
                  }),
                  child: const Text('Revenir aux notes'),
                ),
              ] else ...[
                const Text(
                  'Reprenez vos notes, un échange ou un document pour préparer le suivi.',
                  style: TextStyle(fontSize: 13, height: 1.618),
                ),
                const SizedBox(height: 24),
                DropdownButtonFormField<String>(
                  initialValue: sourceType,
                  decoration: const InputDecoration(labelText: 'À partir de'),
                  items: const [
                    DropdownMenuItem(
                      value: 'NOTES',
                      child: Text('Notes de rencontre'),
                    ),
                    DropdownMenuItem(
                      value: 'MESSAGE',
                      child: Text('Message de suivi'),
                    ),
                    DropdownMenuItem(
                      value: 'PROPOSAL',
                      child: Text('Proposition commerciale'),
                    ),
                    DropdownMenuItem(
                      value: 'TECHNICAL',
                      child: Text('Retour avant-vente'),
                    ),
                  ],
                  onChanged: (v) {
                    sourceType = v!;
                    _changed();
                  },
                ),
                const SizedBox(height: 24),
                _card([
                  const Text(
                    'Les informations de la rencontre',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 12),
                  _field('Notes ou message', notes, lines: 6),
                ]),
                ExpansionTile(
                  title: const Text(
                    'Joindre un document',
                    style: TextStyle(fontSize: 14),
                  ),
                  shape: const Border(),
                  collapsedShape: const Border(),
                  children: [
                    TextButton.icon(
                      onPressed: _document,
                      icon: const Icon(Icons.attach_file),
                      label: const Text('Choisir un PDF, DOCX ou texte · 5 Mo'),
                    ),
                    if (documentName.isNotEmpty) ...[
                      Text(documentName, style: const TextStyle(fontSize: 13)),
                      _field('Passages à retenir', document, lines: 4),
                      TextButton(
                        onPressed: () {
                          document.clear();
                          documentName = '';
                          _changed();
                        },
                        child: const Text('Retirer le document'),
                      ),
                    ],
                  ],
                ),
                ExpansionTile(
                  title: const Text(
                    'Ajouter une prochaine action',
                    style: TextStyle(fontSize: 14),
                  ),
                  shape: const Border(),
                  collapsedShape: const Border(),
                  children: [
                    _field('Action', action, limit: 1000),
                    _field('Responsable · facultatif', owner, limit: 200),
                    TextButton(
                      onPressed: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate:
                              DateTime.tryParse(dueDate ?? '') ??
                              DateTime.now(),
                          firstDate: DateTime(2020),
                          lastDate: DateTime(2100),
                        );
                        if (date != null && mounted) {
                          dueDate = date.toIso8601String().split('T').first;
                          _changed();
                        }
                      },
                      child: Text(
                        dueDate == null
                            ? 'Ajouter une échéance'
                            : 'Échéance : $dueDate',
                      ),
                    ),
                    if (dueDate != null)
                      TextButton(
                        onPressed: () {
                          dueDate = null;
                          _changed();
                        },
                        child: const Text('Retirer l’échéance'),
                      ),
                  ],
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed:
                      notes.text.trim().isEmpty &&
                          document.text.trim().isEmpty &&
                          action.text.trim().isEmpty
                      ? null
                      : _prepare,
                  child: const Text('Préparer le compte rendu'),
                ),
              ],
            ],
          ),
  );

  @override
  void dispose() {
    scroll.dispose();
    debounce?.cancel();
    _saveDraft();
    for (final c in [
      ...sourceControllers,
      summary,
      needs,
      objections,
      actions,
      email,
    ]) {
      c.dispose();
    }
    super.dispose();
  }
}
