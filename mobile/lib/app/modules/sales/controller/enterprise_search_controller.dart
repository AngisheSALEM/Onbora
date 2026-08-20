import 'package:get/get.dart';
import 'sales_controller.dart';

class EnterpriseSearchController extends GetxController {
  final SalesController salesController = Get.find<SalesController>();

  void search(String query) {
    salesController.searchEnterprises(query);
  }
}
