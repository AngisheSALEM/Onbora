import 'package:flutter/material.dart';
import '../../../../data/models/user_model.dart';
import '../../../../data/repositories/auth_repository.dart';
import '../../../../core/storage/session_storage.dart';

class AuthViewModel extends ChangeNotifier {
  final AuthRepository _authRepository;

  AuthViewModel({AuthRepository? authRepository})
      : _authRepository = authRepository ?? AuthRepository();

  UserModel? _currentUser;
  UserModel? get currentUser => _currentUser;

  bool _isBootstrapping = true;
  bool get isBootstrapping => _isBootstrapping;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _isAuthenticated = false;
  bool get isAuthenticated => _isAuthenticated;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  Future<void> checkAuthStatus() async {
    _isBootstrapping = true;
    notifyListeners();

    try {
      final token = await SessionStorage.getToken();
      if (token != null && token.isNotEmpty) {
        _currentUser = await _authRepository.getProfile();
        if (_currentUser != null) {
          _isAuthenticated = true;
        } else {
          // Token present but email/name stored in prefs
          final email = await SessionStorage.getUserEmail() ?? 'commercial@onbora.cg';
          final name = await SessionStorage.getUserName() ?? 'Commercial Onbora';
          final role = await SessionStorage.getUserRole() ?? 'SALESPERSON';
          _currentUser = UserModel(id: 1, username: 'commercial', email: email, role: role, firstName: name);
          _isAuthenticated = true;
        }
      } else {
        _isAuthenticated = false;
      }
    } catch (_) {
      _isAuthenticated = false;
    } finally {
      _isBootstrapping = false;
      notifyListeners();
    }
  }

  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _currentUser = await _authRepository.login(username, password);
      _isAuthenticated = true;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('ApiException: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _authRepository.logout();
    _currentUser = null;
    _isAuthenticated = false;
    notifyListeners();
  }
}
