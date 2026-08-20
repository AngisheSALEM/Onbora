import 'package:get/get.dart';
import '../controller/visit_report_controller.dart';

class VisitReportBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<VisitReportController>(() => VisitReportController());
  }
}
