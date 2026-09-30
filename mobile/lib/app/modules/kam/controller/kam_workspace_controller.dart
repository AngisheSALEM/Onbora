import 'package:get/get.dart';
import '../../../core/api/api_client.dart';

typedef KamData = Map<String, dynamic>;

class KamWorkspaceController extends GetxController {
  KamWorkspaceController({ApiClient? api}) : api = api ?? Get.find<ApiClient>();
  final ApiClient api;
  final accounts = <KamData>[].obs;
  final appointments = <KamData>[].obs;
  final visits = <KamData>[].obs;
  final loading = false.obs;
  final error = ''.obs;
  KamData? selectedAccount, selectedAppointment;

  @override
  void onInit() {
    super.onInit();
    reload();
  }

  static List<KamData> rows(dynamic response, [String? key]) {
    final value = response is Map
        ? response[key] ?? response['results']
        : response;
    return value is List
        ? value.whereType<Map>().map((v) => KamData.from(v)).toList()
        : [];
  }

  Future<void> reload() async {
    if (loading.value) return;
    loading.value = true;
    error.value = '';
    try {
      final data = await Future.wait([
        api.get('/api/kam/accounts/'),
        api.get('/api/kam/appointments/'),
        api.get('/api/kam/visits/'),
      ]);
      accounts.assignAll(rows(data[0], 'accounts'));
      appointments.assignAll(rows(data[1]));
      visits.assignAll(rows(data[2], 'visits'));
    } catch (e) {
      error.value = e.toString();
    } finally {
      loading.value = false;
    }
  }

  Future<KamData> createAppointment(KamData data) async {
    final result = KamData.from(
      await api.post('/api/kam/appointments/', body: data) as Map,
    );
    appointments.add(result);
    selectedAppointment = result;
    return result;
  }

  Future<KamData> completeAppointment(
    int id,
    String transcript,
    String notes,
    String conversionStatus,
  ) async {
    if (transcript.trim().isEmpty && notes.trim().isEmpty) {
      throw StateError('Ajoutez une transcription ou des notes.');
    }
    final result = await api.post(
      '/api/kam/appointments/$id/complete-vocal/',
      body: {
        'transcript': transcript.trim(),
        'notes': notes.trim(),
        'conversion_status': conversionStatus,
      },
    );
    final report = KamData.from(result['report'] as Map);
    final appointment = KamData.from(result['appointment'] as Map);
    final index = appointments.indexWhere((a) => a['id'] == id);
    if (index >= 0) appointments[index] = appointment;
    visits.insert(0, report);
    return report;
  }

  Future<void> updateAccount(int id, KamData data) async {
    await api.post('/api/kam/accounts/$id/update-info/', body: data);
    await reload();
  }
}
