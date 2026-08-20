import 'package:get/get.dart';
import 'sales_controller.dart';

class VisitReportController extends GetxController {
  final SalesController salesController = Get.find<SalesController>();

  void transmitToKAM() {
    salesController.transmitReportToKAM();
  }
}
