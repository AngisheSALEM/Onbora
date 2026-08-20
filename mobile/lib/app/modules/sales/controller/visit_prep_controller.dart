import 'package:get/get.dart';
import 'sales_controller.dart';

class VisitPrepController extends GetxController {
  final SalesController salesController = Get.find<SalesController>();

  void prepareVisit() {
    salesController.prepareVisit();
  }
}
