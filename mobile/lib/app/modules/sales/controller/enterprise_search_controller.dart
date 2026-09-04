import 'package:get/get.dart';
import 'sales_controller.dart';

class EnterpriseSearchController extends GetxController {
  SalesController get salesController => Get.isRegistered<SalesController>()
      ? Get.find<SalesController>()
      : Get.put(SalesController(), permanent: true);

  void search(String query) {
    salesController.searchEnterprises(query);
  }
}
