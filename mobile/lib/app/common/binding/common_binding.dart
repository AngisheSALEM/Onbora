import 'package:get/get.dart';
import '../controller/theme_controller.dart';
import '../controller/common_controller.dart';
import '../../modules/auth/controller/auth_controller.dart';
import '../../modules/sales/controller/sales_controller.dart';
import '../../modules/catalog/controller/catalog_controller.dart';
import '../../core/api/api_client.dart';

class CommonBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<ApiClient>(() => ApiClient(), fenix: true);
    Get.lazyPut<ThemeController>(() => ThemeController(), fenix: true);
    Get.lazyPut<CommonController>(() => CommonController(), fenix: true);
    Get.lazyPut<AuthController>(() => AuthController(), fenix: true);
    Get.lazyPut<SalesController>(() => SalesController(), fenix: true);
    Get.lazyPut<CatalogController>(() => CatalogController(), fenix: true);
  }
}
