import 'package:get/get.dart';
import '../controller/kam_controller.dart';
import '../controller/kam_briefing_controller.dart';
import '../controller/kam_debrief_controller.dart';

class KamBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<KamController>(() => KamController(), fenix: true);
    Get.lazyPut<KamBriefingController>(() => KamBriefingController(), fenix: true);
    Get.lazyPut<KamDebriefController>(() => KamDebriefController(), fenix: true);
  }
}
