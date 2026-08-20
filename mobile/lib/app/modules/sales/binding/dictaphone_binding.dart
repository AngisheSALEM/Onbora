import 'package:get/get.dart';
import '../controller/dictaphone_controller.dart';

class DictaphoneBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<DictaphoneController>(() => DictaphoneController());
  }
}
