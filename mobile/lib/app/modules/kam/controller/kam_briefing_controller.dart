import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../model/kam_briefing_model.dart';
import 'kam_controller.dart';
import '../../../routes/app_routes.dart';

class KamBriefingController extends GetxController {
  final KamController _kamCtrl = Get.isRegistered<KamController>()
      ? Get.find<KamController>()
      : Get.put(KamController());

  final Rx<KamBriefingModel?> briefing = Rx<KamBriefingModel?>(null);
  final RxBool isPrepared = false.obs;
  final RxInt selectedTab = 0.obs; // 0 = L'Essentiel, 1 = Contexte & SLA, 2 = Plan de RDV

  @override
  void onInit() {
    super.onInit();
    _initBriefing();

    // Écoute automatique des changements de compte sélectionnés dans KamController
    ever(_kamCtrl.currentBriefing, (newBriefing) {
      if (newBriefing != null) {
        briefing.value = newBriefing;
        isPrepared.value = newBriefing.isPrepared;
      }
    });
  }

  void _initBriefing() {
    if (_kamCtrl.currentBriefing.value != null) {
      briefing.value = _kamCtrl.currentBriefing.value;
    } else if (_kamCtrl.allAccounts.isNotEmpty) {
      _kamCtrl.selectAccount(_kamCtrl.allAccounts.first);
      briefing.value = _kamCtrl.currentBriefing.value;
    }
  }

  void setTab(int index) {
    selectedTab.value = index;
  }

  void markBriefingAsPrepared() {
    isPrepared.value = true;
    Get.snackbar(
      'Préparation Validée',
      'Briefing validé avec succès. Vous êtes prêt pour la réunion stratégique.',
      snackPosition: SnackPosition.TOP,
      backgroundColor: const Color(0xFF10B981),
      colorText: Colors.white,
      icon: const Icon(Icons.check_circle_rounded, color: Colors.white),
      duration: const Duration(seconds: 3),
    );
  }

  void startStrategicMeeting() {
    isPrepared.value = true;
    Get.toNamed(Routes.KAM_DEBRIEF);
  }
}
