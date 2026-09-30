import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/kam_workspace_controller.dart';
import '../../../common/screen/widget/mobile_page.dart';
import 'kam_screen_helpers.dart';

class KamAccountEditor extends StatefulWidget {
  const KamAccountEditor({super.key, required this.account});
  final KamData account;
  @override
  State<KamAccountEditor> createState() => _KamAccountEditorState();
}

class _KamAccountEditorState extends State<KamAccountEditor> {
  static const fields = {
    'contact_name': 'Nom du contact',
    'contact_role': 'Fonction',
    'contact_phone': 'Téléphone',
    'contact_email': 'Email',
    'current_operator': 'Opérateur actuel',
    'current_connectivity': 'Connectivité actuelle',
    'orange_contract_end_date': 'Fin du contrat Orange (AAAA-MM-JJ)',
    'growth_project': 'Projet de développement',
    'employee_count': 'Nombre de collaborateurs',
    'site_count': 'Nombre de sites',
    'annual_revenue': 'Chiffre d’affaires annuel (USD)',
    'address': 'Adresse',
    'commune': 'Commune',
    'city': 'Ville',
  };
  late final _controllers = fields.map(
    (k, v) => MapEntry(
      k,
      TextEditingController(
        text:
            '${widget.account[k] ?? (((widget.account['briefing'] as Map?)?['firmographics'] as Map?)?[k == 'employee_count'
                    ? 'headcount'
                    : k == 'site_count'
                    ? 'locations_count'
                    : k]) ?? ''}',
      ),
    ),
  );
  bool _busy = false;
  String _error = '';
  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MobilePage(
    title: 'Compléter le compte',
    subtitle: '${widget.account['account_name']}',
    primaryLabel: 'Enregistrer les informations',
    busy: _busy,
    onPrimary: () async {
      setState(() {
        _busy = true;
        _error = '';
      });
      try {
        await workspace().updateAccount(
          accountId(widget.account),
          Map.fromEntries(
            _controllers.entries
                .where(
                  (e) =>
                      ![
                        'employee_count',
                        'site_count',
                        'annual_revenue',
                        'address',
                        'commune',
                        'city',
                      ].contains(e.key) ||
                      e.value.text.trim().isNotEmpty,
                )
                .map((e) => MapEntry(e.key, e.value.text.trim())),
          ),
        );
        final refreshed = workspace().accounts.firstWhere(
          (a) => accountId(a) == accountId(widget.account),
        );
        workspace().selectedAccount = refreshed;
        if (mounted) {
          Get.back();
        }
      } catch (e) {
        if (mounted) setState(() => _error = '$e');
      } finally {
        if (mounted) setState(() => _busy = false);
      }
    },
    children: [
      for (final entry in fields.entries)
        spacedField(
          TextField(
            controller: _controllers[entry.key],
            decoration: InputDecoration(labelText: entry.value),
            keyboardType: entry.key == 'contact_email'
                ? TextInputType.emailAddress
                : entry.key == 'contact_phone'
                ? TextInputType.phone
                : TextInputType.text,
          ),
        ),
      if (_error.isNotEmpty)
        ReadingSection('Enregistrement interrompu', _error),
    ],
  );
}
