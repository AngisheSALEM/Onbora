import 'package:get/get.dart';
import '../controller/kam_navigation_controller.dart';
import '../controller/kam_controller.dart';
import '../../profile/controller/profile_controller.dart';

class KamNavigationBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<KamNavigationController>(() => KamNavigationController());
    Get.lazyPut<KamController>(() => KamController());
    Get.lazyPut<ProfileController>(() => ProfileController());
  }
}
