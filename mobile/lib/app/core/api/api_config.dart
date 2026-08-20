import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConfig {
  /// Default backend URL from .env file or fallback to Render
  static String get baseUrl => dotenv.env['API_BASE_URL'] ?? 'https://onbora-backend.onrender.com';
  
  /// Default API Token from .env file
  static String get apiToken => dotenv.env['API_TOKEN'] ?? '';

  static String _activeUrl = '';

  static String get activeBaseUrl => _activeUrl.isNotEmpty ? _activeUrl : baseUrl;

  static void setBaseUrl(String url) => _activeUrl = url;
}
