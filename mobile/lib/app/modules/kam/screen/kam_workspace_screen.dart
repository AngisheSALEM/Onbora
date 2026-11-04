import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import '../../../core/api/api_client.dart';
import '../../../common/constants/app_constants.dart';
import '../data/kam_repository.dart';
import '../controller/kam_controller.dart';
import '../controller/kam_navigation_controller.dart';
import '../../../common/screen/widget/skeleton_loader.dart';
import 'widget/kam_workspace_widgets.dart';
import 'kam_appointment_screen.dart';
import 'kam_account_workspace_screen.dart';
import 'kam_analysis_edit_screen.dart';

enum KamSection {
  accounts('Comptes', Icons.business_outlined, 'accounts', 'accounts'),
  news('Actualité', Icons.newspaper_outlined, 'feed', 'results'),
  agenda(
    'Rendez-vous',
    Icons.calendar_today_outlined,
    'appointments',
    'appointments',
  ),
  visits('Historique des visites', Icons.history, 'visits', 'visits'),
  risk('Comptes à risque', Icons.shield_outlined, 'churn-radar/risk', null),
  renewals(
    'Renouvellements',
    Icons.event_repeat_outlined,
    'churn-radar/renewals',
    null,
  ),
  upsell('Opportunités', Icons.trending_up, 'churn-radar/upsell', null),
  noAction(
    'Sans prochaine action',
    Icons.pending_actions,
    'churn-radar/no-action',
    null,
  ),
  scoring(
    'Priorisation commerciale',
    Icons.leaderboard_outlined,
    'lead-scoring',
    null,
  ),
  compare(
    'Comparateur',
    Icons.compare_arrows,
    'comparisons/sectors',
    'sectors',
  );

  final String title;
  final IconData icon;
  final String resource;
  final String? collection;
  const KamSection(this.title, this.icon, this.resource, this.collection);
}

KamRepository kamRepository() => Get.isRegistered<KamRepository>()
    ? Get.find<KamRepository>()
    : KamRepository(
        Get.isRegistered<ApiClient>() ? Get.find<ApiClient>() : ApiClient(),
      );

class KamWorkspaceScreen extends StatefulWidget {
  final KamSection section;
  final String? accountAction;
  final int? enterpriseId;
  const KamWorkspaceScreen({
    super.key,
    this.section = KamSection.accounts,
    this.accountAction,
    this.enterpriseId,
  });
  @override
  State<KamWorkspaceScreen> createState() => _KamWorkspaceScreenState();
}

class _KamWorkspaceScreenState extends State<KamWorkspaceScreen> {
  final repo = kamRepository();
  final _asyncKey = GlobalKey<KamAsyncViewState>();
  String _search = '';
  String _filter = 'ALL';
  String _signal = 'ALL';
  bool _busy = false;
  int _page = 1;
  static const _pageSize = 15;
  bool get _news => widget.section == KamSection.news;
  Worker? navigationWorker;
  @override
  void initState() {
    super.initState();
    if (Get.isRegistered<KamNavigationController>()) {
      navigationWorker = ever(
        Get.find<KamNavigationController>().currentIndex,
        (int index) {
          final section = {
            0: KamSection.accounts,
            1: KamSection.news,
            2: KamSection.agenda,
          }[index];
          if (section == widget.section) {
            _summary = null;
            _asyncKey.currentState?.reload();
          }
        },
      );
    }
  }

  @override
  void dispose() {
    navigationWorker?.dispose();
    super.dispose();
  }

  Future<dynamic> _load() => repo.read(
    widget.section.resource,
    query: _news
        ? {
            if (_filter == 'PORTFOLIO' || _filter == 'WEB_DISCOVERY')
              'type': _filter,
            if (_filter == 'SAVED') 'saved': 'true',
            if (_signal != 'ALL') 'signal': _signal,
            if (_search.isNotEmpty) 'search': _search,
            'limit': 100,
            if (widget.enterpriseId != null)
              'enterprise_id': widget.enterpriseId,
          }
        : null,
  );

  void _changeFilter(String value) {
    setState(() {
      _filter = value;
      _page = 1;
    });
    if (_news) _asyncKey.currentState?.reload();
  }

  Future<void> _action(
    Future<dynamic> Function() action,
    String success,
  ) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(success)));
      await _asyncKey.currentState?.reload();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Action non enregistrée. Vérifiez votre connexion et réessayez.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Theme.of(context).brightness == Brightness.dark
        ? AppConstants.backgroundDark
        : AppConstants.backgroundLight,
    appBar: AppBar(
      title: Text(widget.section.title),
      actions: [
        if (_news)
          PopupMenuButton<String>(
            enabled: !_busy,
            tooltip: 'Actions sur les actualités',
            onSelected: (v) => _action(
              () => repo.write(
                v == 'read' ? 'feed/mark-all-read' : 'feed/refresh',
              ),
              v == 'read'
                  ? 'Actualités marquées comme lues.'
                  : 'Actualisation lancée.',
            ),
            itemBuilder: (_) => const [
              PopupMenuItem(
                value: 'read',
                child: Text('Tout marquer comme lu'),
              ),
              PopupMenuItem(
                value: 'refresh',
                child: Text('Actualiser la veille'),
              ),
            ],
          ),
        PopupMenuButton<KamSection>(
          tooltip: 'Espace KAM',
          icon: const Icon(Icons.menu),
          onSelected: (section) => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => KamWorkspaceScreen(section: section),
            ),
          ),
          itemBuilder: (_) => [
            for (final section in KamSection.values)
              PopupMenuItem(
                value: section,
                child: ListTile(
                  leading: Icon(section.icon),
                  title: Text(section.title),
                ),
              ),
          ],
        ),
      ],
    ),
    floatingActionButton: widget.section == KamSection.agenda
        ? FloatingActionButton.extended(
            onPressed: () async {
              final saved = await Navigator.of(context).push<bool>(
                MaterialPageRoute(builder: (_) => const KamAppointmentScreen()),
              );
              if (saved == true) _asyncKey.currentState?.reload();
            },
            icon: const Icon(Icons.add),
            label: const Text('Rendez-vous'),
          )
        : null,
    body: SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 900),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(30),
                  child: TextField(
                    onChanged: (v) => setState(() {
                      _search = v.trim();
                      _page = 1;
                    }),
                    onSubmitted: (_) {
                      if (_news) _asyncKey.currentState?.reload();
                    },
                    decoration: InputDecoration(
                      hintText: 'Rechercher',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _news
                          ? IconButton(
                              tooltip: 'Rechercher',
                              icon: const Icon(Icons.arrow_forward),
                              onPressed: () => _asyncKey.currentState?.reload(),
                            )
                          : null,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      filled: true,
                      fillColor: Theme.of(
                        context,
                      ).colorScheme.surfaceContainerHighest,
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Expanded(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        style: Theme.of(
                          context,
                        ).textTheme.bodyMedium?.copyWith(fontSize: 14),
                        value: _filter,
                        underline: const SizedBox.shrink(),
                        items: [
                          for (final entry in _filters.entries)
                            DropdownMenuItem(
                              value: entry.key,
                              child: Text(
                                entry.value,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                        ],
                        onChanged: (v) {
                          if (v != null) _changeFilter(v);
                        },
                      ),
                    ),
                    if (_news) ...[
                      const SizedBox(width: 16),
                      Expanded(
                        child: DropdownButton<String>(
                          style: Theme.of(
                            context,
                          ).textTheme.bodyMedium?.copyWith(fontSize: 14),
                          isExpanded: true,
                          value: _signal,
                          underline: const SizedBox.shrink(),
                          items: const [
                            DropdownMenuItem(
                              value: 'ALL',
                              child: Text(
                                'Tous les signaux',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            DropdownMenuItem(
                              value: 'STRONG',
                              child: Text(
                                'Signaux forts',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            DropdownMenuItem(
                              value: 'WEAK',
                              child: Text(
                                'Signaux faibles',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                          onChanged: (v) {
                            if (v != null) {
                              setState(() {
                                _signal = v;
                                _page = 1;
                              });
                              _asyncKey.currentState?.reload();
                            }
                          },
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Expanded(
                child: KamAsyncView(
                  key: _asyncKey,
                  load: _load,
                  builder: _content,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );

  Map<String, String> get _filters {
    if (_news) {
      return {
        'ALL': 'Toute l’actualité',
        'PORTFOLIO': 'Mon portefeuille',
        'WEB_DISCOVERY': 'Découvertes web',
        'SAVED': 'Enregistrés',
      };
    }
    if (widget.section == KamSection.agenda) {
      return {
        'ALL': 'Tous les rendez-vous',
        'TODAY': 'Aujourd’hui',
        'SCHEDULED': 'À venir',
        'COMPLETED': 'Effectués',
      };
    }
    if (widget.section == KamSection.scoring) {
      return {
        'ALL': 'Toutes les priorités',
        'TIER_1_PRIORITY': 'Prioritaires',
        'TIER_2_PROSPECT': 'Prospects',
        'TIER_3_NURTURING': 'À accompagner',
      };
    }
    if (![KamSection.accounts, KamSection.visits].contains(widget.section)) {
      return {'ALL': 'Tous les comptes'};
    }
    return {
      'ALL': 'Tous les statuts',
      'PROSPECT': 'Prospects',
      'IN_NEGOTIATION': 'En négociation',
      'CONVERTED': 'Contrats signés',
      'LOST': 'Perdus',
    };
  }

  Widget _content(dynamic data) {
    final rows = KamRepository.records(data, widget.section.collection);
    final filtered = rows.where((row) {
      if (_news) return true;
      final matches =
          _search.isEmpty ||
          [
            row['account_name'],
            row['enterprise_name'],
            row['name'],
            row['title'],
            row['sector'],
            row['location'],
            KamRepository.record(row['briefing'])['industry'],
          ].join(' ').toLowerCase().contains(_search.toLowerCase());
      if (!matches) return false;
      if (_filter == 'ALL') return true;
      if (_filter == 'TODAY') {
        final date = DateTime.tryParse(
          row['scheduled_at']?.toString() ?? '',
        )?.toLocal();
        final now = DateTime.now();
        return date != null &&
            date.year == now.year &&
            date.month == now.month &&
            date.day == now.day;
      }
      return (row['scoring_tier'] ??
              row['status'] ??
              row['conversion_status']) ==
          _filter;
    }).toList();
    if (filtered.isEmpty) {
      return KamEmpty(
        text: _search.isNotEmpty
            ? 'Aucun résultat pour « $_search ». Modifiez votre recherche ou vos filtres.'
            : 'Aucun élément à afficher avec ces filtres.',
        action: 'Actualiser',
        onAction: () => _asyncKey.currentState?.reload(),
      );
    }
    final totalPages = (filtered.length / _pageSize).ceil();
    final pageRows = filtered
        .skip((_page - 1) * _pageSize)
        .take(_pageSize)
        .toList();
    final next = _page < totalPages;
    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 150),
      itemCount: pageRows.length + 2,
      itemBuilder: (context, index) {
        if (index == 0) {
          return widget.section == KamSection.accounts
              ? _portfolio()
              : const SizedBox.shrink();
        }
        if (index == pageRows.length + 1) {
          return Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                tooltip: 'Page précédente',
                onPressed: _page > 1
                    ? () {
                        setState(() => _page--);
                      }
                    : null,
                icon: const Icon(Icons.chevron_left),
              ),
              Text('Page $_page'),
              IconButton(
                tooltip: 'Page suivante',
                onPressed: next
                    ? () {
                        setState(() => _page++);
                      }
                    : null,
                icon: const Icon(Icons.chevron_right),
              ),
            ],
          );
        }
        return _row(pageRows[index - 1]);
      },
    );
  }

  Widget _portfolio() => FutureBuilder<dynamic>(
    future: _summary ??= repo.read('portfolio-summary'),
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        return TextButton(
          onPressed: () => setState(() {
            _summary = repo.read('portfolio-summary');
          }),
          child: const Text('Réessayer le chargement des indicateurs'),
        );
      }
      if (!snapshot.hasData) {
        return const Padding(
          padding: EdgeInsets.only(bottom: 16),
          child: SkeletonBox(height: 100),
        );
      }
      final cards = KamRepository.record(
        KamRepository.record(snapshot.data)['summary_cards'],
      );
      return Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final entry in {
            'b2b_accounts': 'Comptes B2B',
            'high_risk': 'À risque',
            'renewals': 'Renouvellements',
            'upsell': 'Opportunités',
            'no_action': 'Sans action',
          }.entries)
            ActionChip(
              label: Text(
                '${entry.value} : ${KamRepository.record(cards[entry.key])['count'] ?? '—'}',
              ),
              onPressed: () {
                final section = {
                  'b2b_accounts': KamSection.accounts,
                  'high_risk': KamSection.risk,
                  'renewals': KamSection.renewals,
                  'upsell': KamSection.upsell,
                  'no_action': KamSection.noAction,
                }[entry.key]!;
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => KamWorkspaceScreen(section: section),
                  ),
                );
              },
            ),
        ],
      );
    },
  );
  Future<dynamic>? _summary;

  Widget _row(KamRecord row) {
    if (widget.section == KamSection.compare) {
      return KamSurface(
        child: ExpansionTile(
          title: Text(row['sector']?.toString() ?? 'Secteur'),
          subtitle: Text('${row['count'] ?? 0} entreprises'),
          shape: const Border(),
          collapsedShape: const Border(),
          children: [
            for (final enterprise in KamRepository.records(row, 'enterprises'))
              ListTile(
                title: Text(enterprise['name']?.toString() ?? ''),
                subtitle: Text(
                  '${enterprise['city'] ?? ''} · ${enterprise['overall_score'] ?? '—'} / 100',
                ),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => KamComparisonScreen(
                      accountId: KamRepository.accountId(enterprise),
                    ),
                  ),
                ),
              ),
          ],
        ),
      );
    }
    final title = _news
        ? row['title'] ?? 'Actualité'
        : row['account_name'] ??
              row['enterprise_name'] ??
              row['name'] ??
              row['title'] ??
              'Compte';
    return KamSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(
              title.toString(),
              style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w600),
            ),
            subtitle: Text(
              [
                if (row['title'] != title) row['title'],
                row['scheduled_at'],
                row['created_at'],
                row['sector'] ??
                    KamRepository.record(row['briefing'])['industry'],
                row['status_label'] ?? row['conversion_status'],
              ].where((v) => v != null && v != '').map(kamText).join(' · '),
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _open(row),
          ),
          if (_news) ...[
            Text(
              row['summary']?.toString() ?? '',
              style: const TextStyle(fontSize: 16, height: 1.618),
            ),
            Text(
              '${row['source_name'] ?? ''} · ${row['signal_strength_display'] ?? ''}',
              style: const TextStyle(fontSize: 13, height: 1.618),
            ),
            Wrap(
              spacing: 8,
              children: [
                TextButton.icon(
                  onPressed: _busy
                      ? null
                      : () => _action(
                          () => repo.write('feed/${row['id']}/read', {
                            'is_read': row['is_read'] != true,
                          }),
                          'Statut de lecture enregistré.',
                        ),
                  icon: Icon(
                    row['is_read'] == true
                        ? Icons.mark_email_read_outlined
                        : Icons.mark_email_unread_outlined,
                  ),
                  label: Text(
                    row['is_read'] == true ? 'Marquer non lu' : 'Marquer lu',
                  ),
                ),
                TextButton.icon(
                  onPressed: _busy
                      ? null
                      : () => _action(
                          () => repo.write('feed/${row['id']}/save'),
                          'Enregistrement mis à jour.',
                        ),
                  icon: Icon(
                    row['is_saved'] == true
                        ? Icons.bookmark
                        : Icons.bookmark_border,
                  ),
                  label: Text(
                    row['is_saved'] == true ? 'Retirer' : 'Enregistrer',
                  ),
                ),
                if (row['is_web_discovery'] == true &&
                    row['is_converted_to_portfolio'] != true)
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () => _action(
                            () => repo.write('feed/${row['id']}/convert'),
                            'Entreprise ajoutée au portefeuille.',
                          ),
                    child: const Text('Ajouter au portefeuille'),
                  ),
              ],
            ),
          ] else if (widget.section != KamSection.accounts &&
              widget.section != KamSection.agenda &&
              widget.section != KamSection.visits)
            KamDocument(data: row),
          if (!_news && row['executive_summary'] != null)
            Text(
              row['executive_summary'].toString(),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 16, height: 1.618),
            ),
        ],
      ),
    );
  }

  void _open(KamRecord row) {
    Widget screen;
    if (widget.section == KamSection.agenda) {
      screen = KamAppointmentDetailScreen(appointment: row);
    } else if (widget.section == KamSection.visits) {
      screen = KamDataScreen(
        title: 'Rapport de visite',
        resource: 'visits/${row['id']}',
        report: true,
      );
    } else if (_news) {
      screen = KamDataScreen(
        title: row['title']?.toString() ?? 'Actualité',
        initial: row,
      );
    } else {
      try {
        final id = KamRepository.accountId(row);
        screen = widget.accountAction == 'briefing'
            ? KamDataScreen(
                title: 'Analyse avant rendez-vous',
                resource: 'pre-call/$id',
                regenerate: true,
              )
            : widget.accountAction == 'debrief'
            ? KamMeetingScreen(accountId: id)
            : KamAccountWorkspaceScreen(account: row, accountId: id);
      } on FormatException {
        return;
      }
    }
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen)).then((
      _,
    ) {
      if (mounted) _asyncKey.currentState?.reload();
    });
  }
}

/// Keeps existing named links working while replacing their former demo screens.
class KamSelectedAccountScreen extends StatelessWidget {
  final String action;
  const KamSelectedAccountScreen({super.key, required this.action});
  @override
  Widget build(BuildContext context) {
    final id = Get.isRegistered<KamController>()
        ? Get.find<KamController>().selectedAccount.value?.id
        : null;
    if (id == null) return KamWorkspaceScreen(accountAction: action);
    if (action == 'briefing') {
      return KamDataScreen(
        title: 'Analyse avant rendez-vous',
        resource: 'pre-call/$id',
        regenerate: true,
      );
    }
    if (action == 'debrief') return KamMeetingScreen(accountId: id);
    return Scaffold(
      appBar: AppBar(title: const Text('Fiche compte')),
      body: KamAsyncView(
        load: () => kamRepository().read('accounts'),
        builder: (data) {
          final rows = KamRepository.records(
            data,
            'accounts',
          ).where((a) => KamRepository.accountId(a) == id);
          if (rows.isEmpty) return const KamWorkspaceScreen();
          return KamAccountWorkspaceScreen(account: rows.first, accountId: id);
        },
      ),
    );
  }
}

class KamDataScreen extends StatefulWidget {
  final String title;
  final String? resource;
  final KamRecord? initial;
  final bool report;
  final bool regenerate;
  const KamDataScreen({
    super.key,
    required this.title,
    this.resource,
    this.initial,
    this.report = false,
    this.regenerate = false,
  });
  @override
  State<KamDataScreen> createState() => _KamDataScreenState();
}

class _KamDataScreenState extends State<KamDataScreen> {
  final repo = kamRepository();
  final key = GlobalKey<KamAsyncViewState>();
  bool busy = false;
  Future<void> action(Future<dynamic> Function() perform) async {
    if (busy) return;
    setState(() => busy = true);
    try {
      await perform();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Action effectuée.')));
      await key.currentState?.reload();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Action impossible. Vérifiez votre connexion et réessayez.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.title),
      actions: [
        if (widget.regenerate)
          IconButton(
            tooltip: 'Actualiser l’analyse',
            onPressed: busy
                ? null
                : () => action(() => repo.write(widget.resource!)),
            icon: const Icon(Icons.refresh),
          ),
      ],
    ),
    body: SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 800),
          child: KamAsyncView(
            key: key,
            load: () async => widget.resource != null
                ? repo.read(widget.resource!)
                : widget.initial,
            builder: (raw) {
              final data = KamRepository.record(raw);
              return ListView(
                padding: const EdgeInsets.all(24),
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  if (widget.resource?.startsWith('pre-call/') == true &&
                      widget.resource?.endsWith('technical-specs') != true)
                    TextButton.icon(
                      onPressed: busy
                          ? null
                          : () async {
                              final saved = await Navigator.of(context)
                                  .push<bool>(
                                    MaterialPageRoute(
                                      builder: (_) => KamAnalysisEditScreen(
                                        resource: widget.resource!,
                                        analysis: data,
                                      ),
                                    ),
                                  );
                              if (saved == true) key.currentState?.reload();
                            },
                      icon: const Icon(Icons.edit_outlined),
                      label: const Text('Modifier la synthèse'),
                    ),
                  KamDocument(data: raw is List ? raw : data),
                  if (data['raw_transcript'] != null)
                    ExpansionTile(
                      title: const Text('Transcription'),
                      shape: const Border(),
                      collapsedShape: const Border(),
                      children: [KamDocument(data: data['raw_transcript'])],
                    ),
                  if (widget.report) ...[
                    FilledButton.icon(
                      onPressed: busy
                          ? null
                          : () => action(
                              () => repo.write('${widget.resource}/sync-crm'),
                            ),
                      icon: const Icon(Icons.sync),
                      label: const Text('Synchroniser avec le CRM'),
                    ),
                    TextButton.icon(
                      onPressed: () async {
                        await Clipboard.setData(
                          ClipboardData(
                            text:
                                data['follow_up_email_draft']?.toString() ?? '',
                          ),
                        );
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Email copié.')),
                          );
                        }
                      },
                      icon: const Icon(Icons.copy),
                      label: const Text('Copier l’email de suivi'),
                    ),
                  ],
                  if (widget.resource?.endsWith('/technical-specs') == true)
                    FilledButton.icon(
                      onPressed: busy
                          ? null
                          : () => action(() async {
                              final bytes = await repo.api.download(
                                '/api/kam/${widget.resource}/pdf/',
                              );
                              if (!context.mounted) return;
                              final box =
                                  context.findRenderObject() as RenderBox?;
                              await SharePlus.instance.share(
                                ShareParams(
                                  files: [
                                    XFile.fromData(
                                      bytes,
                                      mimeType: 'application/pdf',
                                    ),
                                  ],
                                  fileNameOverrides: [
                                    'Fiche_technique_Onbora.pdf',
                                  ],
                                  sharePositionOrigin: box == null
                                      ? null
                                      : box.localToGlobal(Offset.zero) &
                                            box.size,
                                ),
                              );
                            }),
                      icon: const Icon(Icons.download_outlined),
                      label: const Text('Exporter la fiche PDF'),
                    ),
                  if (data['source_url'] != null)
                    TextButton.icon(
                      onPressed: () => action(() async {
                        final uri = Uri.tryParse(data['source_url'].toString());
                        if (uri == null ||
                            !['http', 'https'].contains(uri.scheme) ||
                            !await launchUrl(
                              uri,
                              mode: LaunchMode.externalApplication,
                            )) {
                          throw const FormatException('Source indisponible');
                        }
                      }),
                      icon: const Icon(Icons.open_in_new),
                      label: const Text('Lire la source'),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    ),
  );
}
