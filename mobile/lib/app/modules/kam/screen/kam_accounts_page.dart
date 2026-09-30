import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../common/screen/widget/mobile_page.dart';
import 'kam_screen_helpers.dart';
import 'kam_account_page.dart';
import 'kam_appointment_form.dart';
import 'kam_intelligence_screen.dart';

class KamAccountsPage extends StatefulWidget {
  const KamAccountsPage({super.key});
  @override
  State<KamAccountsPage> createState() => _KamAccountsPageState();
}

class _KamAccountsPageState extends State<KamAccountsPage> {
  String query = '', filter = 'Tous';
  @override
  Widget build(BuildContext context) {
    final ctrl = workspace();
    return Obx(() {
      final accounts = ctrl.accounts.where((a) {
        final matches = '${a['account_name']} ${a['crm_id']} ${a['location']}'
            .toLowerCase()
            .contains(query.toLowerCase());
        return matches &&
            (filter == 'Tous' ||
                (filter == 'Clients'
                    ? a['conversion_status'] == 'CONVERTED'
                    : a['conversion_status'] != 'CONVERTED'));
      }).toList();
      return MobilePage(
        title: 'Mes comptes',
        tabRoot: true,
        subtitle: '${ctrl.accounts.length} comptes dans votre portefeuille',
        onRefresh: ctrl.reload,
        primaryLabel: 'Planifier un rendez-vous',
        onPrimary: ctrl.accounts.isEmpty
            ? null
            : () => Get.to(() => const KamAppointmentForm()),
        children: [
          spacedField(
            TextField(
              onChanged: (v) => setState(() => query = v),
              decoration: const InputDecoration(
                labelText: 'Rechercher un compte',
                hintText: 'Entreprise, CRM ou localisation',
              ),
            ),
          ),
          Wrap(
            spacing: 8,
            children: ['Tous', 'Clients', 'Prospects']
                .map(
                  (s) => ChoiceChip(
                    label: Text(s),
                    showCheckmark: false,
                    side: BorderSide.none,
                    labelStyle: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                    backgroundColor: Theme.of(context).colorScheme.surface,
                    selectedColor: mobilePrimary.withValues(alpha: .12),
                    selected: filter == s,
                    onSelected: (_) => setState(() => filter = s),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children:
                {
                      'risk': 'À risque',
                      'renewals': 'Renouvellements',
                      'upsell': 'Développement',
                      'no-action': 'Sans prochaine action',
                    }.entries
                    .map(
                      (e) => TextButton(
                        onPressed: () => Get.to(
                          () => KamPortfolioPage(kind: e.key, title: e.value),
                        ),
                        child: Text(e.value),
                      ),
                    )
                    .toList(),
          ),
          const SizedBox(height: 24),
          if (ctrl.loading.value)
            const LinearProgressIndicator(color: mobilePrimary),
          if (ctrl.error.isNotEmpty)
            ReadingSection('Chargement interrompu', ctrl.error.value),
          if (!ctrl.loading.value && accounts.isEmpty)
            const ReadingSection(
              'Aucun compte',
              'Aucun compte ne correspond à votre recherche.',
            ),
          for (final a in accounts)
            neutralRow(
              '${a['account_name']}',
              '${a['crm_id']} · ${a['status_label']}\n${a['location']}',
              () {
                ctrl.selectedAccount = a;
                Get.to(() => KamAccountPage(account: a));
              },
            ),
        ],
      );
    });
  }
}
