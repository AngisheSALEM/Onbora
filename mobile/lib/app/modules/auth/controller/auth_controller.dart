import 'package:get/get.dart';
import '../model/user_model.dart';
import '../../../core/api/api_client.dart';
import '../../../core/storage/session_storage.dart';
import '../../../routes/app_routes.dart';

class AuthController extends GetxController {
  final ApiClient _apiClient = Get.find<ApiClient>();

  final Rx<UserModel?> _currentUser = Rx<UserModel?>(null);
  UserModel? get currentUser => _currentUser.value;

  final RxBool isBootstrapping = true.obs;
  final RxBool isLoading = false.obs;
  final RxBool isAuthenticated = false.obs;
  final RxString errorMessage = ''.obs;

  @override
  void onInit() {
    super.onInit();
    checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    isBootstrapping.value = true;
    try {
      final token = await SessionStorage.getToken();
      if (token != null && token.isNotEmpty) {
        final profile = await getProfile();
        if (profile != null) {
          _currentUser.value = profile;
          isAuthenticated.value = true;
        } else {
          final email = await SessionStorage.getUserEmail() ?? 'commercial@onbora.cd';
          final name = await SessionStorage.getUserName() ?? 'Commercial Onbora';
          final role = await SessionStorage.getUserRole() ?? 'SALESPERSON';
          _currentUser.value = UserModel(id: 1, username: 'commercial', email: email, role: role, firstName: name);
          isAuthenticated.value = true;
        }

        // Automatic session restore & redirection if currently on LOGIN page
        if (Get.currentRoute == Routes.LOGIN || Get.currentRoute.isEmpty) {
          Future.microtask(() => Get.offAllNamed(Routes.MAIN_NAVIGATION));
        }
      } else {
        isAuthenticated.value = false;
      }
    } catch (_) {
      isAuthenticated.value = false;
    } finally {
      isBootstrapping.value = false;
    }
  }

  Future<UserModel?> getProfile() async {
    try {
      final response = await _apiClient.get('/api/auth/me/');
      return UserModel.fromJson(response as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<bool> login(String username, String password) async {
    isLoading.value = true;
    errorMessage.value = '';

    try {
      final response = await _apiClient.post(
        '/api/auth/login/',
        body: {
          'username': username,
          'password': password,
        },
        includeAuth: false,
      );

      final token = response['token'] as String;
      final userData = response['user'] as Map<String, dynamic>;
      final user = UserModel.fromJson(userData);

      await SessionStorage.saveSession(
        token: token,
        email: user.email,
        role: user.role,
        name: user.displayName,
      );

      _currentUser.value = user;
      isAuthenticated.value = true;
      isLoading.value = false;

      Get.offAllNamed(Routes.MAIN_NAVIGATION);
      return true;
    } catch (e) {
      errorMessage.value = e.toString().replaceAll('ApiException: ', '');
      isLoading.value = false;
      return false;
    }
  }

  Future<void> logout() async {
    await SessionStorage.clearSession();
    _currentUser.value = null;
    isAuthenticated.value = false;
    Get.offAllNamed(Routes.LOGIN);
  }
}
