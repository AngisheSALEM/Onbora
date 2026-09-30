import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/sales_controller.dart';
import 'widget/notifications_modal.dart';
import 'widget/deal_share_modal.dart';
import '../../catalog/screen/widget/roi_simulator_modal.dart';
import '../../../routes/app_routes.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/mobile_page.dart';

class SalesHomeScreen extends StatelessWidget {
  const SalesHomeScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final sales = Get.find<SalesController>();
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Obx(() {
      final active = sales.selectedEnterprise.value;
      return MobilePage(
        title: AppConstants.salesVisitsTitle,
        tabRoot: true,
        subtitle:
            '${sales.kpiVisitsCount.value} visites · ${sales.kpiReportsCount.value} rapports',
        primaryLabel: active == null
            ? 'Préparer une visite'
            : 'Continuer la visite',
        onPrimary: () => Get.toNamed(
          active == null ? Routes.ENTERPRISE_SEARCH : Routes.VISIT_FORM,
        ),
        onRefresh: () async {
          await sales.fetchDashboardStats();
          await sales.fetchVisitsHistory();
          await sales.fetchEnterprises();
        },
        children: [
          if (sales.pendingSyncCount.value > 0)
            TextButton(
              onPressed: sales.syncPendingQueue,
              child: Text(
                '${sales.pendingSyncCount.value} éléments à synchroniser',
              ),
            ),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: () => NotificationsModal.show(context, isDark: dark),
              child: Text(
                'Notifications (${sales.unreadNotificationsCount.value})',
              ),
            ),
          ),
          const SizedBox(height: 24),
          if (active != null) ...[
            ReadingSection(
              'Visite en cours',
              '${active.name}\n${active.location ?? ''}',
            ),
            Wrap(
              spacing: 12,
              runSpacing: 8,
              children: [
                TextButton(
                  onPressed: () => Get.toNamed(Routes.VISIT_PREPARATION),
                  child: const Text('Lire le briefing'),
                ),
                TextButton(
                  onPressed: () => Get.toNamed(Routes.DICTAPHONE),
                  child: const Text('Compte-rendu vocal'),
                ),
                TextButton(
                  onPressed: () => Get.toNamed(Routes.DOCUMENT_SCAN),
                  child: const Text('Scanner un document'),
                ),
                TextButton(
                  onPressed: () =>
                      RoiSimulatorModal.show(context, enterprise: active),
                  child: const Text('Simuler le retour sur investissement'),
                ),
                TextButton(
                  onPressed: () =>
                      DealShareModal.show(context, enterprise: active),
                  child: const Text('Partager la proposition'),
                ),
                TextButton(
                  onPressed: sales.resetFlow,
                  child: const Text('Changer d’entreprise'),
                ),
              ],
            ),
            const SizedBox(height: 28),
          ],
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: () => Get.toNamed(Routes.VISITS_HISTORY),
              child: const Text('Voir l’historique des visites'),
            ),
          ),
          const SizedBox(height: 28),
          const Text(
            'Entreprises à visiter',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          if (sales.searchResults.isEmpty)
            const ReadingSection(
              'Aucune entreprise',
              'Recherchez une entreprise pour préparer votre prochaine visite.',
            ),
          for (final ent in sales.searchResults.take(6))
            ListTile(
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
              title: Text(
                ent.name,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
              subtitle: Text(
                '${ent.sector ?? ''}\n${ent.location ?? ''}',
                style: const TextStyle(height: 1.6),
              ),
              onTap: () {
                sales.selectEnterprise(ent);
                Get.toNamed(Routes.VISIT_FORM);
              },
            ),
          const SizedBox(height: 28),
          const Text(
            'Mes Plaques Assignées',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          for (final plaque in sales.myAssignedPlaques)
            ListTile(
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
              title: Text(plaque.name),
              subtitle: Text(plaque.code),
              onTap: () => Get.toNamed(Routes.PLAQUE_DETAIL, arguments: plaque),
            ),
        ],
      );
    });
  }
}
