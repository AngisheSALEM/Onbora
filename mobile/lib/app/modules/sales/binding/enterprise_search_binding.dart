import 'package:get/get.dart';
import '../controller/enterprise_search_controller.dart';

class EnterpriseSearchBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<EnterpriseSearchController>(() => EnterpriseSearchController());
  }
}
