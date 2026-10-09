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
  String toString() => statusCode != null ? '$message (Code $statusCode)' : message;
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
      final token = await SessionStorage.getToken() ?? ApiConfig.apiToken;
      if (token.isNotEmpty) {
        headers[HttpHeaders.authorizationHeader] = 'Token $token';
      }
    }

    return headers;
  }

  Uri _buildUri(String path, [Map<String, dynamic>? queryParams]) {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    final urlString = '${ApiConfig.activeBaseUrl}$cleanPath';
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
      throw ApiException("Impossible de joindre le serveur backend (${ApiConfig.activeBaseUrl}). Vérifiez votre connexion ou l'adresse du serveur.");
    } on TimeoutException {
      throw ApiException("Le serveur Render prend du temps à démarrer (Cold Start). Veuillez réessayer dans 15 secondes.");
    } on http.ClientException catch (e) {
      throw ApiException("Erreur réseau: ${e.message}");
    } on Exception catch (e) {
      throw ApiException("Erreur: ${e.toString()}");
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
      throw ApiException("Impossible de joindre le serveur backend (${ApiConfig.activeBaseUrl}). Vérifiez que le serveur est démarré ou l'adresse configurée.");
    } on TimeoutException {
      throw ApiException("Délai d'attente dépassé pour ${ApiConfig.activeBaseUrl} (Cold Start Render). Réessayez.");
    } on http.ClientException catch (e) {
      throw ApiException("Erreur réseau: ${e.message}");
    } on Exception catch (e) {
      throw ApiException("Erreur: ${e.toString()}");
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
      throw ApiException("Identifiants incorrects ou session expirée.", statusCode: 401);
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
      } else if (responseData is Map && responseData.containsKey('message')) {
        msg = responseData['message'].toString();
      }
      throw ApiException(msg, statusCode: statusCode);
    }
  }
}
