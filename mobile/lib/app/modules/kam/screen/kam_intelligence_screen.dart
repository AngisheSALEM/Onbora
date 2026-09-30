import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';
import '../controller/kam_workspace_controller.dart';
import '../../../common/screen/widget/mobile_page.dart';
import 'kam_workspace_screens.dart';

String statement(dynamic v) =>
    v is Map ? '${v['text'] ?? v['summary'] ?? ''}' : readableValue(v);

class KamIntelligencePage extends StatefulWidget {
  const KamIntelligencePage({super.key, required this.account});
  final KamData account;
  @override
  State<KamIntelligencePage> createState() => _KamIntelligencePageState();
}

class _KamIntelligencePageState extends State<KamIntelligencePage> {
  KamData? _brief;
  String _error = '';
  bool _busy = false;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool regenerate = false}) async {
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      final endpoint = '/api/kam/pre-call/${accountId(widget.account)}/';
      final response = regenerate
          ? await workspace().api.post(endpoint)
          : await workspace().api.get(endpoint);
      if (mounted) setState(() => _brief = KamData.from(response as Map));
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final summary = _brief?['ai_summary'] as Map? ?? {};
    final solutions = _brief?['recommended_solutions'] as List? ?? [];
    final evidence = _brief?['evidence'] as List? ?? [];
    return MobilePage(
      title: 'Analyse du compte',
      subtitle: '${widget.account['account_name']}',
      primaryLabel: _brief == null ? 'Réessayer' : 'Actualiser l’analyse',
      busy: _busy,
      onPrimary: () => _load(regenerate: _brief != null),
      children: [
        if (_error.isNotEmpty) ReadingSection('Analyse indisponible', _error),
        if (_brief != null) ...[
          ReadingSection(
            'Synthèse',
            statement(
              summary['overview'] ??
                  (_brief!['company_overview'] as Map?)?['summary'],
            ),
          ),
          ReadingSection(
            'Faits clés',
            (summary['key_facts'] as List? ?? []).map(statement).join('\n\n'),
          ),
          ReadingSection(
            'Points à vérifier',
            (summary['contradictions'] as List? ?? [])
                .map(statement)
                .join('\n\n'),
          ),
          ReadingSection(
            'Informations manquantes',
            readableValue(summary['gaps']),
          ),
          for (final solution in solutions)
            ReadingSection(
              '${solution['name']}',
              '${solution['description'] ?? ''}\n${solution['category'] ?? ''}\n${solution['sla'] ?? ''}',
            ),
          ReadingSection(
            'Questions de découverte',
            readableValue(_brief!['critical_discovery_questions']),
          ),
          ReadingSection(
            'Règles de préparation',
            readableValue(_brief!['golden_rules']),
          ),
          for (final source in evidence)
            TextButton(
              onPressed: () {
                final uri = Uri.tryParse('${source['url']}');
                if (uri != null && ['https', 'http'].contains(uri.scheme)) {
                  launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
              child: Text(
                '${source['title'] ?? source['publisher'] ?? 'Consulter la source'}',
              ),
            ),
          TextButton(
            onPressed: () async {
              final updated = await Get.to<KamData>(
                () =>
                    KamAnalysisEditor(account: widget.account, brief: _brief!),
              );
              if (updated != null && mounted) setState(() => _brief = updated);
            },
            child: const Text('Modifier la synthèse et les solutions'),
          ),
          TextButton(
            onPressed: () => Get.to(
              () => KamAppointmentForm(account: widget.account, express: true),
            ),
            child: const Text('Démarrer une réunion pour ce compte'),
          ),
        ],
      ],
    );
  }
}

class KamAnalysisEditor extends StatefulWidget {
  const KamAnalysisEditor({
    super.key,
    required this.account,
    required this.brief,
  });
  final KamData account, brief;
  @override
  State<KamAnalysisEditor> createState() => _KamAnalysisEditorState();
}

class _KamAnalysisEditorState extends State<KamAnalysisEditor> {
  late final Map _original = widget.brief['ai_summary'] as Map? ?? {};
  late final _overview = TextEditingController(
    text: statement(_original['overview']),
  );
  late final _facts = TextEditingController(
    text: (_original['key_facts'] as List? ?? []).map(statement).join('\n'),
  );
  late final _contradictions = TextEditingController(
    text: (_original['contradictions'] as List? ?? [])
        .map(statement)
        .join('\n'),
  );
  late final _gaps = TextEditingController(
    text: readableValue(_original['gaps']),
  );
  late final List<KamData> _solutions = KamWorkspaceController.rows(
    widget.brief['recommended_solutions'],
  );
  bool _busy = false;
  String _error = '';
  @override
  void dispose() {
    for (final c in [_overview, _facts, _contradictions, _gaps]) {
      c.dispose();
    }
    super.dispose();
  }

  List<String> lines(String s) =>
      s.split('\n').map((v) => v.trim()).where((v) => v.isNotEmpty).toList();
  @override
  Widget build(BuildContext context) => MobilePage(
    title: 'Modifier l’analyse',
    subtitle: '${widget.account['account_name']}',
    primaryLabel: 'Enregistrer et actualiser',
    busy: _busy,
    onPrimary: _save,
    children: [
      for (final e in {
        'Synthèse': _overview,
        'Faits clés (un par ligne)': _facts,
        'Points à vérifier (un par ligne)': _contradictions,
        'Informations manquantes': _gaps,
      }.entries)
        spacedField(
          TextField(
            controller: e.value,
            minLines: 3,
            maxLines: 8,
            decoration: InputDecoration(
              labelText: e.key,
              alignLabelWithHint: true,
            ),
          ),
        ),
      const ReadingSection(
        'Solutions recommandées',
        'Complétez les solutions adaptées au compte.',
      ),
      for (var i = 0; i < _solutions.length; i++) ...[
        spacedField(
          TextFormField(
            key: ObjectKey(_solutions[i]),
            initialValue: '${_solutions[i]['name'] ?? ''}',
            decoration: const InputDecoration(labelText: 'Nom de la solution'),
            onChanged: (v) => _solutions[i]['name'] = v,
          ),
        ),
        spacedField(
          TextFormField(
            key: ValueKey('description-${identityHashCode(_solutions[i])}'),
            initialValue: '${_solutions[i]['description'] ?? ''}',
            minLines: 2,
            maxLines: 5,
            decoration: const InputDecoration(labelText: 'Description'),
            onChanged: (v) => _solutions[i]['description'] = v,
          ),
        ),
        TextButton(
          onPressed: () => setState(() => _solutions.removeAt(i)),
          child: const Text('Retirer cette solution'),
        ),
        const SizedBox(height: 24),
      ],
      TextButton(
        onPressed: () => setState(
          () => _solutions.add({
            'name': '',
            'description': '',
            'category': 'SERVICES',
          }),
        ),
        child: const Text('Ajouter une solution'),
      ),
      TextButton(
        onPressed: _searchCatalog,
        child: const Text('Rechercher dans le catalogue'),
      ),
      if (_error.isNotEmpty)
        ReadingSection('Enregistrement interrompu', _error),
    ],
  );
  Future<void> _save() async {
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      final result = await workspace().api.patch(
        '/api/kam/pre-call/${accountId(widget.account)}/',
        body: {
          'ai_summary': {
            ..._original,
            'status': 'kam_edited',
            'overview': {
              'text': _overview.text,
              'sources': (_original['overview'] as Map?)?['sources'] ?? [],
            },
            'key_facts': lines(_facts.text).map((t) => {'text': t}).toList(),
            'contradictions': lines(
              _contradictions.text,
            ).map((t) => {'text': t}).toList(),
            'gaps': lines(_gaps.text),
          },
          'recommended_solutions': _solutions
              .where((s) => '${s['name']}'.trim().isNotEmpty)
              .toList(),
          'resynthesize': true,
        },
      );
      if (mounted) Get.back(result: KamData.from(result as Map));
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _searchCatalog() async {
    final offer = await Get.to<KamData>(() => const KamCatalogSearchPage());
    if (offer != null && mounted) {
      setState(
        () => _solutions.add({
          'id': offer['id'],
          'name': offer['name'] ?? offer['title'],
          'category': offer['category'],
          'description': offer['description'] ?? offer['pitch'] ?? '',
        }),
      );
    }
  }
}

class KamCatalogSearchPage extends StatefulWidget {
  const KamCatalogSearchPage({super.key});
  @override
  State<KamCatalogSearchPage> createState() => _KamCatalogSearchPageState();
}

class _KamCatalogSearchPageState extends State<KamCatalogSearchPage> {
  final _query = TextEditingController();
  List<KamData> _offers = [];
  bool _busy = false;
  String _error = '';
  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MobilePage(
    title: 'Catalogue de solutions',
    primaryLabel: 'Rechercher',
    busy: _busy,
    onPrimary: () async {
      if (_query.text.trim().isEmpty) return;
      setState(() {
        _busy = true;
        _error = '';
      });
      try {
        final data = await workspace().api.post(
          '/api/ai/catalog/search/',
          body: {'query': _query.text.trim(), 'limit': 8},
        );
        if (mounted) {
          setState(
            () => _offers = KamWorkspaceController.rows(data, 'results'),
          );
        }
      } catch (e) {
        if (mounted) setState(() => _error = '$e');
      } finally {
        if (mounted) setState(() => _busy = false);
      }
    },
    children: [
      spacedField(
        TextField(
          controller: _query,
          decoration: const InputDecoration(labelText: 'Solution recherchée'),
        ),
      ),
      if (_error.isNotEmpty) ReadingSection('Recherche interrompue', _error),
      for (final offer in _offers)
        neutralRow(
          '${offer['name'] ?? offer['title']}',
          '${offer['description'] ?? offer['category'] ?? ''}',
          () => Get.back(result: offer),
        ),
    ],
  );
}

class KamSignalsPage extends StatefulWidget {
  const KamSignalsPage({super.key, required this.account});
  final KamData account;
  @override
  State<KamSignalsPage> createState() => _KamSignalsPageState();
}

class _KamSignalsPageState extends State<KamSignalsPage> {
  KamData? _radar;
  String _error = '';
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = KamData.from(
        await workspace().api.get(
              '/api/kam/accounts/${accountId(widget.account)}/radar/',
            )
            as Map,
      );
      if (mounted) {
        setState(() {
          _radar = r;
          _error = '';
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    }
  }

  @override
  Widget build(BuildContext context) => MobilePage(
    title: 'Risques et opportunités',
    subtitle: '${widget.account['account_name']}',
    onRefresh: _load,
    primaryLabel: 'Planifier une action',
    onPrimary: () => Get.to(() => KamAppointmentForm(account: widget.account)),
    children: [
      if (_error.isNotEmpty) ReadingSection('Analyse indisponible', _error),
      if (_radar == null && _error.isEmpty)
        const LinearProgressIndicator(color: mobilePrimary),
      if (_radar != null) ...[
        ReadingSection(
          'Évaluation du compte',
          'Santé du compte : ${_radar!['health_score']} / 100\nRisque de churn : ${_radar!['churn_risk_score']} / 100',
        ),
        ReadingSection(
          'Facteurs de risque',
          (_radar!['risk_reasons'] as List? ?? [])
              .map(
                (r) => r is Map
                    ? '${r['label'] ?? r['reason'] ?? r['title'] ?? ''}\n${r['evidence'] ?? r['description'] ?? ''}'
                    : '$r',
              )
              .join('\n\n'),
        ),
        ReadingSection(
          'Plan de rétention',
          (_radar!['retention_plan'] as Map?)?['action']?.toString() ?? '',
        ),
        for (final o in _radar!['upsell_opportunities'] as List? ?? [])
          ReadingSection(
            '${o['solution'] ?? o['name'] ?? o['title'] ?? 'Opportunité'}',
            '${o['talking_point'] ?? o['description'] ?? ''}',
          ),
        ReadingSection(
          'Prochaine action',
          dateLabel(_radar!['next_action_at']),
        ),
      ],
    ],
  );
}

class KamPortfolioPage extends StatefulWidget {
  const KamPortfolioPage({super.key, required this.kind, required this.title});
  final String kind, title;
  @override
  State<KamPortfolioPage> createState() => _KamPortfolioPageState();
}

class _KamPortfolioPageState extends State<KamPortfolioPage> {
  List<KamData> _rows = [];
  String _error = '';
  bool _loading = true;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await workspace().api.get(
        '/api/kam/churn-radar/${widget.kind}/',
      );
      if (mounted) {
        setState(() {
          _rows = KamWorkspaceController.rows(r);
          _error = '';
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => MobilePage(
    title: widget.title,
    subtitle: 'Votre portefeuille KAM',
    onRefresh: _load,
    primaryLabel: 'Planifier un rendez-vous',
    onPrimary: () => Get.to(() => const KamAppointmentForm()),
    children: [
      if (_loading) const LinearProgressIndicator(color: mobilePrimary),
      if (_error.isNotEmpty) ReadingSection('Chargement interrompu', _error),
      if (!_loading && _rows.isEmpty)
        const ReadingSection(
          'Aucun compte',
          'Aucun compte ne correspond à cette vue actuellement.',
        ),
      for (final row in _rows)
        neutralRow(
          '${row['name']}',
          [
            row['industry'],
            row['riskLevel'],
            row['criticalSignals'],
            row['lastInteraction'],
            row['renewalTimeline'],
            row['activeService'],
            row['status'],
            row['recommendedAction'],
            row['strategicAngle'],
            row['recommendedSolution'],
            row['renewalDate'],
            row['estimatedPotential'],
          ].where((v) => v != null).join('\n'),
          () {
            final a = workspace().accounts.firstWhereOrNull(
              (a) => '${a['account_id']}' == '${row['accountId']}',
            );
            if (a != null) Get.to(() => KamAccountPage(account: a));
          },
        ),
    ],
  );
}
