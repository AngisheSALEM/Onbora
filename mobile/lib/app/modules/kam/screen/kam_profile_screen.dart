import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../profile/controller/profile_controller.dart';
import '../../profile/screen/widget/memoji_picker_modal.dart';
import '../controller/kam_navigation_controller.dart';
import 'kam_workspace_screens.dart';
import '../../../common/screen/widget/mobile_page.dart';

class KamProfileScreen extends StatelessWidget {
  const KamProfileScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final profile = Get.isRegistered<ProfileController>()
        ? Get.find<ProfileController>()
        : Get.put(ProfileController());
    final user = profile.authController.currentUser;
    final nav = Get.find<KamNavigationController>();
    return Obx(
      () => MobilePage(
        title: 'Profil KAM',
        tabRoot: true,
        subtitle: user?.displayName ?? 'Key Account Manager',
        primaryLabel: 'Se déconnecter',
        onPrimary: profile.logout,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: ClipOval(
              child: Image.asset(
                profile.currentAvatar.value,
                width: 72,
                height: 72,
                fit: BoxFit.cover,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: () => MemojiPickerModal.show(
                context,
                isDark: Theme.of(context).brightness == Brightness.dark,
              ),
              child: const Text('Modifier l’avatar'),
            ),
          ),
          const SizedBox(height: 24),
          ReadingSection(
            'Votre compte',
            '${user?.email ?? ''}\nKey Account Manager',
          ),
          neutralRow(
            'Portefeuille',
            '${workspace().accounts.length} comptes',
            () => nav.changePage(0),
          ),
          neutralRow(
            'Agenda et préparation',
            '${workspace().appointments.length} rendez-vous',
            () => nav.changePage(1),
          ),
          neutralRow(
            'Visites et rapports',
            '${workspace().visits.length} rapports',
            () => nav.changePage(2),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Mode sombre'),
            value: profile.themeController.isDarkMode,
            onChanged: (_) => profile.themeController.toggleTheme(),
          ),
        ],
      ),
    );
  }
}
