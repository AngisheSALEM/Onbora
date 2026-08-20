import 'package:get/get.dart';

class CommonController extends GetxController {
  final RxBool isOnline = true.obs;
  final RxString statusMessage = ''.obs;

  void updateOnlineStatus(bool status) {
    isOnline.value = status;
  }

  void showNotification(String message) {
    statusMessage.value = message;
    Get.snackbar('Onbora', message, snackPosition: SnackPosition.BOTTOM);
  }
}
