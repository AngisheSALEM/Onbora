class ApiConfig {
  /// Default production backend host on Render
  static const String renderUrl = 'https://onbora-backend.onrender.com';
  
  /// Local development backend hosts
  static const String emulatorUrl = 'http://10.0.2.2:8000';
  static const String localhostUrl = 'http://localhost:8000';

  static String baseUrl = renderUrl;

  static void useRenderServer() => baseUrl = renderUrl;
  static void useLocalEmulator() => baseUrl = emulatorUrl;
  static void useCustomUrl(String url) => baseUrl = url;
}
