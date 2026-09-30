import 'package:flutter/material.dart';
import 'kam_workspace_screens.dart';
import '../../../common/screen/widget/mobile_page.dart';

class KamAccountDetailScreen extends StatelessWidget {
  const KamAccountDetailScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final account = workspace().selectedAccount;
    return account == null
        ? const MobilePage(
            title: 'Compte client',
            children: [
              ReadingSection(
                'Aucun compte sélectionné',
                'Sélectionnez un compte dans votre portefeuille.',
              ),
            ],
          )
        : KamAccountPage(account: account);
  }
}
