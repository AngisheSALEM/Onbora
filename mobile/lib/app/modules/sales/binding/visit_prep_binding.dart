import 'package:get/get.dart';
import '../controller/visit_prep_controller.dart';

class VisitPrepBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<VisitPrepController>(() => VisitPrepController());
  }
}
