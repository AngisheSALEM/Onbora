import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConfig {
  static const String defaultRenderUrl = 'https://onbora-backend.onrender.com';

  /// Default backend URL from .env file or fallback to Render
  static String get baseUrl {
    try {
      if (dotenv.isInitialized) {
        return dotenv.env['API_BASE_URL'] ?? defaultRenderUrl;
      }
    } catch (_) {}
    return defaultRenderUrl;
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
