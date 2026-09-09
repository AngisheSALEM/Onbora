import '../../core/api/api_client.dart';
import '../models/enterprise_model.dart';
import '../models/visit_prep_model.dart';
import '../models/visit_report_model.dart';

class SalesRepository {
  final ApiClient _apiClient;

  SalesRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Search prospects in CRM Kaabu or local DB
  Future<List<EnterpriseModel>> searchEnterprises(String query) async {
    try {
      final response = await _apiClient.get(
        '/api/sales/enterprises/search/',
        queryParams: {'q': query},
      );

      if (response is List) {
        return response.map((item) => EnterpriseModel.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (_) {
      // Resilient fallback when offline
    }

    return [];
  }

  /// Create a visit preparation brief with BANT and ROI metrics
  /// Create a visit preparation brief with BANT and ROI metrics
  Future<VisitPrepModel> createVisitPreparation(int enterpriseId) async {
    try {
      final response = await _apiClient.get(
        '/api/sales/enterprises/$enterpriseId/brief/',
      );
      return VisitPrepModel.fromJson(response as Map<String, dynamic>);
    } catch (_) {
      final fallbackResp = await _apiClient.post(
        '/api/sales/visit-preparations/',
        body: {'enterprise': enterpriseId},
      );
      return VisitPrepModel.fromJson(fallbackResp as Map<String, dynamic>);
    }
  }

  /// Submit visit audio transcript / text to generate report via AI
  Future<VisitReportModel> createVisitReport({
    required int preparationId,
    required String rawTranscript,
    String? audioFilePath,
  }) async {
    try {
      final response = await _apiClient.post(
        '/api/sales/visit-reports/generate-from-ai/',
        body: {
          'preparation_id': preparationId,
          'transcript': rawTranscript,
        },
      );
      return VisitReportModel.fromJson(response as Map<String, dynamic>);
    } catch (_) {
      final body = <String, dynamic>{
        'preparation': preparationId,
        'raw_transcript': rawTranscript,
      };
      if (audioFilePath != null) {
        body['audio_file_path'] = audioFilePath;
      }
      final fallbackResponse = await _apiClient.post(
        '/api/sales/visit-reports/',
        body: body,
      );
      return VisitReportModel.fromJson(fallbackResponse as Map<String, dynamic>);
    }
  }

  /// Transmit visit report to KAM for validation & dispatch
  Future<Map<String, dynamic>> transmitToKAM(int reportId) async {
    final response = await _apiClient.post(
      '/api/sales/visit-reports/$reportId/transmit/',
    );
    return response as Map<String, dynamic>;
  }

  /// Deduplicate prospect via Kaabu CRM
  Future<Map<String, dynamic>> deduplicateKaabu({
    required String name,
    String siren = '',
    String domain = '',
  }) async {
    final response = await _apiClient.post(
      '/api/sales/integrations/kaabu/deduplicate/',
      body: {
        'name': name,
        'siren': siren,
        'domain': domain,
      },
    );
    return response as Map<String, dynamic>;
  }
}
