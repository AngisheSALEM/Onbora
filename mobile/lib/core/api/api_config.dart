import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConfig {
  /// Default production backend host on Render
  static const String renderUrl = 'https://onbora-backend.onrender.com';
  
  /// Local development backend hosts
  static const String emulatorUrl = 'http://10.0.2.2:8000';
  static const String localhostUrl = 'http://localhost:8000';

  static String? _customUrl;

  static String get baseUrl {
    if (_customUrl != null) return _customUrl!;
    try {
      if (dotenv.isInitialized) {
        final envUrl = dotenv.env['API_BASE_URL'];
        if (envUrl != null && envUrl.trim().isNotEmpty) {
          return envUrl.trim();
        }
      }
    } catch (_) {}
    return renderUrl;
  }

  static set baseUrl(String url) {
    _customUrl = url;
  }

  static void useRenderServer() => baseUrl = renderUrl;
  static void useLocalEmulator() => baseUrl = emulatorUrl;
  static void useCustomUrl(String url) => baseUrl = url;
}
