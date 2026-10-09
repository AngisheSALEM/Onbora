import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConfig {
  static const String defaultRenderUrl = 'https://onbora-backend.onrender.com';
  static const String defaultLocalUrl = 'http://10.69.77.195:8000';

  static String? _customUrl;

  /// Default backend URL from .env file or fallback to local IP
  static String get baseUrl {
    if (_customUrl != null && _customUrl!.isNotEmpty) return _customUrl!;
    try {
      if (dotenv.isInitialized) {
        final envUrl = dotenv.env['API_BASE_URL'];
        if (envUrl != null && envUrl.trim().isNotEmpty) {
          return envUrl.trim();
        }
      }
    } catch (_) {}
    return defaultLocalUrl;
  }

  static set baseUrl(String url) {
    _customUrl = url;
  }
  
  /// Default API Token from .env file
  static String get apiToken {
    try {
      if (dotenv.isInitialized) {
        return dotenv.env['API_TOKEN'] ?? '';
      }
    } catch (_) {}
    return '';
  }

  static String get activeBaseUrl => baseUrl;
}
