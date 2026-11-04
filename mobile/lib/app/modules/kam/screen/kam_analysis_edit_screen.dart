import 'package:flutter/material.dart';
import '../data/kam_repository.dart';
import 'kam_workspace_screen.dart';

class KamAnalysisEditScreen extends StatefulWidget {
  final String resource;
  final KamRecord analysis;
  const KamAnalysisEditScreen({
    super.key,
    required this.resource,
    required this.analysis,
  });
  @override
  State<KamAnalysisEditScreen> createState() => _KamAnalysisEditScreenState();
}

class _KamAnalysisEditScreenState extends State<KamAnalysisEditScreen> {
  final form = GlobalKey<FormState>();
  late final summary = KamRepository.record(widget.analysis['ai_summary']);
  late final overview = TextEditingController(
    text: KamRepository.record(summary['overview'])['text']?.toString() ?? '',
  );
  late final facts = TextEditingController(
    text: KamRepository.records(
      summary,
      'key_facts',
    ).map((r) => r['text']).join('\n'),
  );
  late final vigilance = TextEditingController(
    text: KamRepository.records(
      summary,
      'contradictions',
    ).map((r) => r['text']).join('\n'),
  );
  late final gaps = TextEditingController(
    text: (summary['gaps'] as List? ?? []).join('\n'),
  );
  late final solutions =
      KamRepository.records(widget.analysis, 'recommended_solutions')
          .map(
            (r) => {
              for (final key in ['name', 'category', 'description', 'sla'])
                key: TextEditingController(text: r[key]?.toString() ?? ''),
            },
          )
          .toList();
  bool busy = false;
  String? error;
  @override
  void dispose() {
    for (final c in [overview, facts, vigilance, gaps]) {
      c.dispose();
    }
    for (final row in solutions) {
      for (final c in row.values) {
        c.dispose();
      }
    }
    super.dispose();
  }

  List<String> lines(TextEditingController c) => c.text
      .split('\n')
      .map((s) => s.trim())
      .where((s) => s.isNotEmpty)
      .toList();
  List<KamRecord> sourcedLines(TextEditingController c, String field) {
    final originals = KamRepository.records(summary, field);
    return lines(c)
        .map(
          (text) => originals.firstWhere(
            (row) => row['text'] == text,
            orElse: () => {'text': text},
          ),
        )
        .toList();
  }

  Future<void> save() async {
    if (busy || !form.currentState!.validate()) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await kamRepository().api.patch(
        '/api/kam/${widget.resource}/',
        body: {
          'ai_summary': {
            ...summary,
            'overview':
                KamRepository.record(summary['overview'])['text'] ==
                    overview.text.trim()
                ? summary['overview']
                : {'text': overview.text.trim()},
            'key_facts': sourcedLines(facts, 'key_facts'),
            'contradictions': sourcedLines(vigilance, 'contradictions'),
            'gaps': lines(gaps),
          },
          'recommended_solutions': [
            for (final row in solutions)
              {
                ...KamRepository.records(
                  widget.analysis,
                  'recommended_solutions',
                ).firstWhere(
                  (original) => original['name'] == row['name']!.text.trim(),
                  orElse: () => {},
                ),
                for (final e in row.entries) e.key: e.value.text.trim(),
              },
          ],
          'resynthesize': false,
        },
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Les modifications n’ont pas été enregistrées. Réessayez.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Modifier la synthèse')),
    body: Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          for (final entry in [
            (overview, 'Présentation'),
            (facts, 'Faits clés — un par ligne'),
            (vigilance, 'Points de vigilance — un par ligne'),
            (gaps, 'Informations à compléter — une par ligne'),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: TextFormField(
                controller: entry.$1,
                minLines: 3,
                maxLines: 8,
                enabled: !busy,
                decoration: InputDecoration(labelText: entry.$2),
              ),
            ),
          const Text(
            'Solutions recommandées',
            style: TextStyle(fontSize: 21, fontWeight: FontWeight.w600),
          ),
          for (final row in solutions)
            Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: Column(
                children: [
                  for (final e in {
                    'name': 'Nom de la solution *',
                    'category': 'Catégorie',
                    'description': 'Description',
                    'sla': 'Engagement de service',
                  }.entries)
                    TextFormField(
                      controller: row[e.key],
                      enabled: !busy,
                      decoration: InputDecoration(labelText: e.value),
                      validator: (v) =>
                          e.key == 'name' && (v == null || v.trim().isEmpty)
                          ? 'Renseignez la solution.'
                          : null,
                    ),
                  TextButton.icon(
                    onPressed: busy
                        ? null
                        : () => setState(() {
                            solutions.remove(row);
                            for (final c in row.values) {
                              c.dispose();
                            }
                          }),
                    icon: const Icon(Icons.remove_circle_outline),
                    label: const Text('Retirer la solution'),
                  ),
                ],
              ),
            ),
          TextButton.icon(
            onPressed: busy
                ? null
                : () => setState(
                    () => solutions.add({
                      for (final key in [
                        'name',
                        'category',
                        'description',
                        'sla',
                      ])
                        key: TextEditingController(),
                    }),
                  ),
            icon: const Icon(Icons.add),
            label: const Text('Ajouter une solution'),
          ),
          if (error != null) Text(error!),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: busy ? null : save,
            child: Text(busy ? 'Enregistrement…' : 'Enregistrer'),
          ),
        ],
      ),
    ),
  );
}
