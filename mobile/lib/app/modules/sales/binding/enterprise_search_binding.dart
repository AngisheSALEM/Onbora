import 'package:get/get.dart';
import '../controller/enterprise_search_controller.dart';
import '../controller/sales_controller.dart';

class EnterpriseSearchBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<SalesController>(() => SalesController(), fenix: true);
    Get.lazyPut<EnterpriseSearchController>(() => EnterpriseSearchController());
  }
}
