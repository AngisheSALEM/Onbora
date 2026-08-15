import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'api_config.dart';
import '../storage/session_storage.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, {this.statusCode});

  @override
  String toString() => 'ApiException: $message (Status $statusCode)';
}

class ApiClient {
  final http.Client _httpClient;

  ApiClient({http.Client? httpClient}) : _httpClient = httpClient ?? http.Client();

  Future<Map<String, String>> _getHeaders({bool includeAuth = true, String? contentType}) async {
    final headers = <String, String>{
      HttpHeaders.contentTypeHeader: contentType ?? 'application/json; charset=UTF-8',
      HttpHeaders.acceptHeader: 'application/json',
    };

    if (includeAuth) {
      final token = await SessionStorage.getToken();
      if (token != null && token.isNotEmpty) {
        headers[HttpHeaders.authorizationHeader] = 'Token $token';
      }
    }

    return headers;
  }

  Uri _buildUri(String path, [Map<String, dynamic>? queryParams]) {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    final urlString = '${ApiConfig.baseUrl}$cleanPath';
    final uri = Uri.parse(urlString);

    if (queryParams != null && queryParams.isNotEmpty) {
      final stringParams = queryParams.map((key, value) => MapEntry(key, value.toString()));
      return uri.replace(queryParameters: stringParams);
    }
    return uri;
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? queryParams, bool includeAuth = true}) async {
    final uri = _buildUri(path, queryParams);
    final headers = await _getHeaders(includeAuth: includeAuth);

    try {
      final response = await _httpClient.get(uri, headers: headers).timeout(const Duration(seconds: 45));
      return _processResponse(response);
    } on SocketException {
      throw ApiException("Impossible de se connecter au serveur backend. Vérifiez votre connexion ou l'adresse du serveur.");
    } on TimeoutException {
      throw ApiException("Le serveur Render prend du temps à démarrer (Cold Start). Veuillez réessayer dans 15 secondes.");
    } on Exception catch (e) {
      throw ApiException("Erreur réseau: ${e.toString()}");
    }
  }

  Future<dynamic> post(String path, {dynamic body, bool includeAuth = true}) async {
    final uri = _buildUri(path);
    final headers = await _getHeaders(includeAuth: includeAuth);
    final jsonBody = body != null ? jsonEncode(body) : null;

    try {
      final response = await _httpClient.post(uri, headers: headers, body: jsonBody).timeout(const Duration(seconds: 45));
      return _processResponse(response);
    } on SocketException {
      throw ApiException("Impossible de joindre le serveur Onbora sur ${ApiConfig.baseUrl}. Le serveur s'initialise ou votre connexion est coupée.");
    } on TimeoutException {
      throw ApiException("Délai d'attente dépassé (Cold Start Render). Réessayez la connexion.");
    } on Exception catch (e) {
      throw ApiException("Erreur connexion: ${e.toString()}");
    }
  }

  dynamic _processResponse(http.Response response) {
    final statusCode = response.statusCode;

    dynamic responseData;
    try {
      if (response.body.isNotEmpty) {
        responseData = jsonDecode(utf8.decode(response.bodyBytes));
      }
    } catch (_) {
      responseData = response.body;
    }

    if (statusCode >= 200 && statusCode < 300) {
      return responseData;
    } else if (statusCode == 401) {
      throw ApiException("Session expirée ou non autorisée. Veuillez vous reconnecter.", statusCode: 401);
    } else if (statusCode == 403) {
      throw ApiException("Accès refusé. Privilèges insuffisants pour cette action.", statusCode: 403);
    } else if (statusCode == 404) {
      throw ApiException("Ressource introuvable sur le serveur.", statusCode: 404);
    } else {
      String msg = "Erreur serveur ($statusCode)";
      if (responseData is Map && responseData.containsKey('detail')) {
        msg = responseData['detail'].toString();
      } else if (responseData is Map && responseData.containsKey('error')) {
        msg = responseData['error'].toString();
      }
      throw ApiException(msg, statusCode: statusCode);
    }
  }
}
