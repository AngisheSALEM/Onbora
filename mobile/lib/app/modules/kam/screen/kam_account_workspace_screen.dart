import 'package:flutter/material.dart';
import '../data/kam_repository.dart';
import 'kam_workspace_screen.dart';
import 'kam_appointment_screen.dart';
import 'widget/kam_workspace_widgets.dart';

class KamAccountWorkspaceScreen extends StatelessWidget {
  final KamRecord account;
  final int accountId;
  const KamAccountWorkspaceScreen({
    super.key,
    required this.account,
    required this.accountId,
  });
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        (account['account_name'] ?? account['name'] ?? 'Fiche compte')
            .toString(),
      ),
    ),
    body: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          account['location']?.toString() ?? '',
          style: const TextStyle(fontSize: 13, height: 1.618),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          icon: const Icon(Icons.calendar_today_outlined),
          label: const Text('Planifier un rendez-vous'),
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => KamAppointmentScreen(accountId: accountId),
            ),
          ),
        ),
        const SizedBox(height: 16),
        for (final entry in <(String, String, IconData, bool)>[
          (
            'Analyse avant rendez-vous',
            'pre-call/$accountId',
            Icons.description_outlined,
            true,
          ),
          (
            'Briefing du compte',
            'briefing/$accountId',
            Icons.business_outlined,
            false,
          ),
          (
            'Diagnostic du compte',
            'accounts/$accountId/radar',
            Icons.shield_outlined,
            false,
          ),
          (
            'Actualités du compte',
            'accounts/$accountId/news',
            Icons.newspaper_outlined,
            false,
          ),
          (
            'Fiche technique',
            'pre-call/$accountId/technical-specs',
            Icons.settings_ethernet_outlined,
            true,
          ),
        ])
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(entry.$3),
            title: Text(entry.$1),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => entry.$1 == 'Actualités du compte'
                    ? KamWorkspaceScreen(
                        section: KamSection.news,
                        enterpriseId: accountId,
                      )
                    : KamDataScreen(
                        title: entry.$1,
                        resource: entry.$2,
                        regenerate: entry.$4,
                      ),
              ),
            ),
          ),
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.devices_outlined),
          title: const Text('Parc installé'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => KamInstalledOffersScreen(accountId: accountId),
            ),
          ),
        ),
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.compare_arrows),
          title: const Text('Comparaison sectorielle'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => KamComparisonScreen(accountId: accountId),
            ),
          ),
        ),
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.edit_outlined),
          title: const Text('Mettre à jour les informations'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) =>
                  KamAccountEditScreen(accountId: accountId, account: account),
            ),
          ),
        ),
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.mic_none),
          title: const Text('Débrief de compte'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => KamMeetingScreen(accountId: accountId),
            ),
          ),
        ),
        ExpansionTile(
          title: const Text('Informations du compte'),
          shape: const Border(),
          collapsedShape: const Border(),
          children: [KamDocument(data: account)],
        ),
      ],
    ),
  );
}

class KamAccountEditScreen extends StatefulWidget {
  final int accountId;
  final KamRecord account;
  const KamAccountEditScreen({
    super.key,
    required this.accountId,
    required this.account,
  });
  @override
  State<KamAccountEditScreen> createState() => _KamAccountEditScreenState();
}

class _KamAccountEditScreenState extends State<KamAccountEditScreen> {
  bool initialized = false;
  static const fields = {
    'contact_name': 'Contact',
    'contact_role': 'Fonction',
    'contact_phone': 'Téléphone',
    'contact_email': 'Email',
    'current_operator': 'Opérateur actuel',
    'current_connectivity': 'Connectivité actuelle',
    'orange_contract_end_date': 'Fin du contrat Orange (AAAA-MM-JJ)',
    'growth_project': 'Projet de développement',
  };
  late final controllers = {
    for (final key in fields.keys)
      key: TextEditingController(text: widget.account[key]?.toString() ?? ''),
  };
  final form = GlobalKey<FormState>();
  bool busy = false;
  String? error;
  @override
  void dispose() {
    for (final c in controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> save() async {
    if (busy || !form.currentState!.validate()) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await kamRepository().write('accounts/${widget.accountId}/update-info', {
        for (final e in controllers.entries) e.key: e.value.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Informations enregistrées.')),
        );
        Navigator.of(context).pop(true);
      }
    } catch (_) {
      if (mounted) {
        setState(
          () =>
              error = 'Les informations n’ont pas été enregistrées. Réessayez.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Informations du compte')),
    body: KamAsyncView(
      load: () => kamRepository().read('accounts'),
      builder: (raw) {
        if (!initialized) {
          final matches = KamRepository.records(
            raw,
            'accounts',
          ).where((a) => KamRepository.accountId(a) == widget.accountId);
          if (matches.isEmpty) {
            return KamEmpty(
              text: 'Ce compte n’est plus disponible dans votre portefeuille.',
              action: 'Retour',
              onAction: () => Navigator.of(context).pop(),
            );
          }
          final current = matches.first;
          for (final entry in controllers.entries) {
            entry.value.text = current[entry.key]?.toString() ?? '';
          }
          initialized = true;
        }
        return Form(
          key: form,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              for (final e in fields.entries)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: TextFormField(
                    controller: controllers[e.key],
                    enabled: !busy,
                    decoration: InputDecoration(labelText: e.value),
                    validator: (v) {
                      if (e.key == 'orange_contract_end_date' &&
                          v != null &&
                          v.isNotEmpty &&
                          (DateTime.tryParse(v) == null ||
                              !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(v))) {
                        return 'Utilisez le format AAAA-MM-JJ.';
                      }
                      return null;
                    },
                  ),
                ),
              if (error != null) Text(error!),
              FilledButton(
                onPressed: busy ? null : save,
                child: Text(busy ? 'Enregistrement…' : 'Enregistrer'),
              ),
            ],
          ),
        );
      },
    ),
  );
}

class KamInstalledOffersScreen extends StatefulWidget {
  final int accountId;
  const KamInstalledOffersScreen({super.key, required this.accountId});
  @override
  State<KamInstalledOffersScreen> createState() =>
      _KamInstalledOffersScreenState();
}

class _KamInstalledOffersScreenState extends State<KamInstalledOffersScreen> {
  final repo = kamRepository();
  final key = GlobalKey<KamAsyncViewState>();
  bool deleting = false;
  Future<void> remove(KamRecord offer) async {
    if (deleting) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Retirer cette offre du parc ?'),
        content: Text(
          (offer['installed_offer_name'] ?? offer['name'] ?? '').toString(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Retirer'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => deleting = true);
    try {
      await repo.api.delete(
        '/api/kam/accounts/${widget.accountId}/installed-offers/${offer['id']}/',
      );
      await key.currentState?.reload();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('L’offre n’a pas été retirée. Réessayez.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => deleting = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Parc installé')),
    floatingActionButton: FloatingActionButton.extended(
      onPressed: () async {
        final saved = await Navigator.of(context).push<bool>(
          MaterialPageRoute(
            builder: (_) => _KamOfferForm(accountId: widget.accountId),
          ),
        );
        if (saved == true) key.currentState?.reload();
      },
      icon: const Icon(Icons.add),
      label: const Text('Ajouter une offre'),
    ),
    body: KamAsyncView(
      key: key,
      load: () => repo.read('accounts/${widget.accountId}/installed-offers'),
      builder: (data) {
        final offers = KamRepository.records(data);
        if (offers.isEmpty) {
          return KamEmpty(
            text: 'Aucune offre installée renseignée.',
            action: 'Actualiser',
            onAction: () => key.currentState?.reload(),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 100),
          itemCount: offers.length,
          itemBuilder: (_, i) => KamSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                KamDocument(data: offers[i]),
                TextButton.icon(
                  onPressed: deleting ? null : () => remove(offers[i]),
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Retirer du parc'),
                ),
              ],
            ),
          ),
        );
      },
    ),
  );
}

class _KamOfferForm extends StatefulWidget {
  final int accountId;
  const _KamOfferForm({required this.accountId});
  @override
  State<_KamOfferForm> createState() => _KamOfferFormState();
}

class _KamOfferFormState extends State<_KamOfferForm> {
  final form = GlobalKey<FormState>();
  final name = TextEditingController();
  final bandwidth = TextEditingController();
  final cost = TextEditingController();
  final licenses = TextEditingController(text: '1');
  final equipment = TextEditingController();
  final end = TextEditingController();
  String category = 'CONNECTIVITY';
  String provider = 'ORANGE_BUSINESS';
  String status = 'ACTIVE';
  bool busy = false;
  String? error;
  @override
  void dispose() {
    for (final c in [name, bandwidth, cost, licenses, equipment, end]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> save() async {
    if (busy || !form.currentState!.validate()) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await kamRepository().write(
        'accounts/${widget.accountId}/installed-offers',
        {
          'installed_offer_name': name.text.trim(),
          'category': category,
          'provider': provider,
          'contract_status': status,
          'bandwidth_mbps': int.tryParse(bandwidth.text),
          'active_licenses_count': int.tryParse(licenses.text) ?? 1,
          'monthly_cost_mrr': double.tryParse(cost.text) ?? 0,
          'contract_end_date': end.text.trim().isEmpty ? null : end.text.trim(),
          'technical_equipment': equipment.text.trim(),
        },
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'L’offre n’a pas été ajoutée. Vérifiez les champs et réessayez.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Ajouter une offre installée')),
    body: Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          for (final e in <(TextEditingController, String)>[
            (name, 'Nom de l’offre *'),
            (bandwidth, 'Débit (Mbps)'),
            (licenses, 'Licences actives'),
            (cost, 'Coût mensuel'),
            (end, 'Fin du contrat (AAAA-MM-JJ)'),
            (equipment, 'Équipement technique'),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextFormField(
                controller: e.$1,
                enabled: !busy,
                decoration: InputDecoration(labelText: e.$2),
                validator: (v) {
                  if (e.$1 == name && (v == null || v.trim().isEmpty)) {
                    return 'Renseignez le nom de l’offre.';
                  }
                  if ([bandwidth, licenses, cost].contains(e.$1) &&
                      v != null &&
                      v.isNotEmpty &&
                      (num.tryParse(v) == null || num.parse(v) < 0)) {
                    return 'Saisissez un nombre positif.';
                  }
                  if (e.$1 == end &&
                      v != null &&
                      v.isNotEmpty &&
                      (DateTime.tryParse(v) == null ||
                          !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(v))) {
                    return 'Utilisez le format AAAA-MM-JJ.';
                  }
                  return null;
                },
              ),
            ),
          _select('Catégorie', category, {
            'CONNECTIVITY': 'Connectivité',
            'CLOUD': 'Cloud',
            'SECURITY': 'Sécurité',
            'COLLABORATIVE': 'Collaboration',
            'PAYMENT': 'Paiement',
          }, (v) => setState(() => category = v)),
          _select('Opérateur', provider, {
            'ORANGE_BUSINESS': 'Orange Business',
            'CONCURRENT': 'Concurrent',
            'AUTRE': 'Autre',
          }, (v) => setState(() => provider = v)),
          _select('Statut du contrat', status, {
            'ACTIVE': 'Actif',
            'EXPIRED': 'Expiré',
            'PENDING_ACTIVATION': 'En cours de déploiement',
            'SUSPENDED': 'Suspendu',
            'TERMINATED': 'Résilié',
          }, (v) => setState(() => status = v)),
          if (error != null) Text(error!),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: busy ? null : save,
            child: const Text('Ajouter l’offre'),
          ),
        ],
      ),
    ),
  );
  Widget _select(
    String label,
    String value,
    Map<String, String> values,
    ValueChanged<String> changed,
  ) => DropdownButtonFormField<String>(
    initialValue: value,
    decoration: InputDecoration(labelText: label),
    items: [
      for (final e in values.entries)
        DropdownMenuItem(value: e.key, child: Text(e.value)),
    ],
    onChanged: busy ? null : (v) => changed(v!),
  );
}

class KamComparisonScreen extends StatefulWidget {
  final int accountId;
  const KamComparisonScreen({super.key, required this.accountId});
  @override
  State<KamComparisonScreen> createState() => _KamComparisonScreenState();
}

class _KamComparisonScreenState extends State<KamComparisonScreen> {
  String peer = 'benchmark';
  final repo = kamRepository();
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Comparaison sectorielle')),
    body: KamAsyncView(
      key: ValueKey(peer),
      load: () => repo.read(
        'comparisons',
        query: {'enterprise_a': widget.accountId, 'enterprise_b': peer},
      ),
      builder: (raw) {
        final data = KamRepository.record(raw);
        final peers = KamRepository.records(data, 'sector_peers');
        final a =
            KamRepository.record(data['meta_a'])['name']?.toString() ??
            'Entreprise';
        final b =
            KamRepository.record(data['meta_b'])['name']?.toString() ??
            'Moyenne sectorielle';
        return ListView(
          padding: const EdgeInsets.all(24),
          children: [
            DropdownButtonFormField<String>(
              initialValue: peer,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Comparer avec'),
              items: [
                const DropdownMenuItem(
                  value: 'benchmark',
                  child: Text('Moyenne sectorielle'),
                ),
                for (final p in peers)
                  DropdownMenuItem(
                    value: p['id'].toString(),
                    child: Text(
                      p['name'].toString(),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
              onChanged: (v) {
                if (v != null) setState(() => peer = v);
              },
            ),
            const SizedBox(height: 24),
            Text(
              data['headline']?.toString() ?? '',
              style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            Text(
              '$a : ${data['overall_score_a'] ?? 'Non renseigné'} / 100\n'
              '$b : ${data['overall_score_b'] ?? 'Non renseigné'} / 100',
              style: const TextStyle(fontSize: 16, height: 1.618),
            ),
            const SizedBox(height: 24),
            for (final row in KamRepository.records(data, 'criteria_breakdown'))
              KamSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      row['criterion']?.toString() ?? '',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '$a : ${row['val_a'] ?? 'Non renseigné'}\n$b : ${row['val_b'] ?? 'Non renseigné'}',
                      style: const TextStyle(fontSize: 13, height: 1.618),
                    ),
                  ],
                ),
              ),
            const Text(
              'Recommandations commerciales',
              style: TextStyle(fontSize: 21, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            for (final rec in KamRepository.records(
              data,
              'kam_recommendations',
            ))
              KamSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      rec['solution_title']?.toString() ?? '',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      rec['pitch_argument']?.toString() ?? '',
                      style: const TextStyle(fontSize: 16, height: 1.618),
                    ),
                  ],
                ),
              ),
          ],
        );
      },
    ),
  );
}
