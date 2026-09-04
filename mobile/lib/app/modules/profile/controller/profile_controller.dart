import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../auth/controller/auth_controller.dart';
import '../../../common/controller/theme_controller.dart';
import '../../../routes/app_routes.dart';
import '../model/memoji_model.dart';

class ProfileController extends GetxController {
  static const String _avatarStorageKey = 'onbora_user_memoji_avatar';

  AuthController get authController => Get.isRegistered<AuthController>()
      ? Get.find<AuthController>()
      : Get.put(AuthController(), permanent: true);

  ThemeController get themeController => Get.isRegistered<ThemeController>()
      ? Get.find<ThemeController>()
      : Get.put(ThemeController(), permanent: true);

  final RxString currentAvatar = MemojiData.defaultMemoji.obs;

  @override
  void onInit() {
    super.onInit();
    _loadPersistedAvatar();
  }

  Future<void> _loadPersistedAvatar() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_avatarStorageKey);
      if (saved != null && saved.isNotEmpty) {
        currentAvatar.value = saved;
      }
    } catch (_) {
      // Fallback default avatar
    }
  }

  Future<void> selectAvatar(String assetPath) async {
    currentAvatar.value = assetPath;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_avatarStorageKey, assetPath);
    } catch (_) {
      // Ignore storage errors
    }
  }

  void logout() async {
    await authController.logout();
    Get.offAllNamed(Routes.LOGIN);
  }
}
