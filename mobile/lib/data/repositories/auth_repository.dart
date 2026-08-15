import '../../core/api/api_client.dart';
import '../../core/storage/session_storage.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiClient _apiClient;

  AuthRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<UserModel> login(String username, String password) async {
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

    return user;
  }

  Future<UserModel?> getProfile() async {
    try {
      final response = await _apiClient.get('/api/auth/me/');
      return UserModel.fromJson(response as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    await SessionStorage.clearSession();
  }
}
