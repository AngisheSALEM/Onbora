import 'package:get/get.dart';
import '../../auth/controller/auth_controller.dart';
import '../../../common/controller/theme_controller.dart';
import '../../../routes/app_routes.dart';

class ProfileController extends GetxController {
  final AuthController authController = Get.find<AuthController>();
  final ThemeController themeController = Get.find<ThemeController>();

  void logout() async {
    await authController.logout();
    Get.offAllNamed(Routes.LOGIN);
  }
}
