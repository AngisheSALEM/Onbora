import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:onbora_sales/data/local/local_cache_service.dart';
import 'package:onbora_sales/data/sync/outbox_manager.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('LocalCacheService saves and retrieves briefings and templates', () async {
    final cache = await LocalCacheService.initialize();

    await cache.saveBriefing(42, {'key_metric': 'Fibre 100M', 'status': 'ELIGIBLE'});
    final loadedBriefing = cache.getBriefing(42);
    expect(loadedBriefing, isNotNull);
    expect(loadedBriefing!['key_metric'], 'Fibre 100M');

    await cache.saveQualificationTemplate('SOHO', {'segment': 'SOHO', 'version': 1});
    final loadedTemplate = cache.getQualificationTemplate('SOHO');
    expect(loadedTemplate, isNotNull);
    expect(loadedTemplate!['segment'], 'SOHO');
  });

  test('OutboxManager generates UUIDv4 idempotency keys and persists commands', () async {
    final cache = await LocalCacheService.initialize();
    final manager = OutboxManager(cache);

    expect(manager.pendingCount, 0);

    final cmd = await manager.enqueueVisitCompletion(
      enterpriseId: 101,
      preparationId: 202,
      executiveSummary: "Visite terrain effectuée sans réseau.",
      confirmedNeeds: ["Fibre Pro", "VoIP"],
      objectionsRaised: ["Prix"],
      qualificationAnswers: {
        "soho_activity": "Commerce",
        "soho_decider_present": true,
        "workstations_count": 5
      },
    );

    expect(cmd.id, isNotEmpty);
    expect(cmd.idempotencyKey, isNotEmpty);
    expect(cmd.idempotencyKey.split('-').length, 5); // Format UUID: 8-4-4-4-12
    expect(cmd.contentHash, isNotEmpty);
    expect(cmd.status, 'pending');
    expect(manager.pendingCount, 1);

    // Re-instanciation pour vérifier la persistance hors-ligne
    final managerReloaded = OutboxManager(cache);
    expect(managerReloaded.pendingCount, 1);
    final pendingList = managerReloaded.getPendingCommands();
    expect(pendingList.first.id, cmd.id);
    expect(pendingList.first.idempotencyKey, cmd.idempotencyKey);
    expect(pendingList.first.payload['enterprise_id'], 101);

    // Mise à jour de statut et nettoyage
    await managerReloaded.updateCommandStatus(cmd.id, 'completed');
    expect(managerReloaded.pendingCount, 0);

    await managerReloaded.clearCompleted();
    expect(managerReloaded.getAllCommands().length, 0);
  });
}
