import 'package:get/get.dart';
import '../controller/main_navigation_controller.dart';
import '../../sales/controller/sales_controller.dart';
import '../../catalog/controller/catalog_controller.dart';
import '../../profile/controller/profile_controller.dart';

class MainNavigationBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<MainNavigationController>(() => MainNavigationController());
    Get.lazyPut<SalesController>(() => SalesController());
    Get.lazyPut<CatalogController>(() => CatalogController());
    Get.lazyPut<ProfileController>(() => ProfileController());
  }
}
