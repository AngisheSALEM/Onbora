import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:geolocator/geolocator.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:maplibre_gl/maplibre_gl.dart';
import '../controller/sales_controller.dart';
import 'widget/ai_brief_modal.dart';
import '../../../routes/app_routes.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/glass_card.dart';
import '../../../common/screen/widget/scale_tap.dart';

/// Premier Onglet : Carte Vectorielle MapLibre GL + MapTiler
/// Télécharge uniquement les coordonnées géométriques (.pbf) compressées via CDN mondial,
/// et calcule le rendu en local sur GPU pour une fluidité 60-120 FPS et une consommation data minimale.
class PlaqueMapHomeScreen extends StatefulWidget {
  const PlaqueMapHomeScreen({super.key});

  @override
  State<PlaqueMapHomeScreen> createState() => _PlaqueMapHomeScreenState();
}

class _PlaqueMapHomeScreenState extends State<PlaqueMapHomeScreen> {
  MapLibreMapController? _mapController;
  bool _isStyleLoaded = false;
  bool _hasLocationPermission = false;

  static const LatLng _kinshasaGombeCenter = LatLng(-4.3033, 15.3084);
  static const LatLng _kinshasaLimeteCenter = LatLng(-4.3450, 15.3400);
  static const LatLng _kinshasaNgaliemaCenter = LatLng(-4.3250, 15.2600);
  static const LatLng _lubumbashiCenter = LatLng(-11.6608, 27.4794);

  @override
  void initState() {
    super.initState();
    _checkAndRequestLocationPermission();
  }

  Future<void> _checkAndRequestLocationPermission() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.always || permission == LocationPermission.whileInUse) {
        if (mounted) {
          setState(() {
            _hasLocationPermission = true;
          });
        }
      }
    } catch (_) {
      // Permission non disponible (environnement test/web ou refus)
    }
  }

  Future<void> _recenterOnUser() async {
    await _checkAndRequestLocationPermission();
    if (_hasLocationPermission) {
      try {
        final pos = await Geolocator.getCurrentPosition();
        final userLatLng = LatLng(pos.latitude, pos.longitude);
        _mapController?.animateCamera(
          CameraUpdate.newCameraPosition(
            CameraPosition(target: userLatLng, zoom: 15.0),
          ),
        );
      } catch (_) {}
    } else {
      Get.snackbar(
        'Localisation requise',
        'Veuillez activer la géolocalisation pour afficher votre position sur la carte.',
        snackPosition: SnackPosition.BOTTOM,
        margin: const EdgeInsets.all(16),
        backgroundColor: const Color(0xEE18181B),
        colorText: Colors.white,
      );
    }
  }

  String _getMapStyle(bool isDark) {
    final apiKey = dotenv.env['MAPTILER_API_KEY'] ?? AppConstants.mapTilerApiKey;
    if (apiKey.isNotEmpty && apiKey != 'YOUR_MAPTILER_KEY') {
      return isDark
          ? '${AppConstants.mapTilerDarkStyleUrl}$apiKey'
          : '${AppConstants.mapTilerStreetsStyleUrl}$apiKey';
    }
    // Style vectoriel MapLibre par défaut (100% gratuit, 0 clé requise)
    return AppConstants.mapLibreDemoStyleUrl;
  }

  void _onMapCreated(MapLibreMapController controller) {
    _mapController = controller;
    controller.onCircleTapped.add((circle) {
      final data = circle.data;
      if (data != null && data.containsKey('id')) {
        final entId = data['id'] as int;
        final salesCtrl = Get.find<SalesController>();
        final found = salesCtrl.searchResults.firstWhereOrNull((e) => e.id == entId);
        if (found != null) {
          salesCtrl.setMapEnterprise(found);
          _updateMapMarkers();
        }
      }
    });
  }

  void _onStyleLoaded() {
    setState(() {
      _isStyleLoaded = true;
    });
    _updateMapMarkers();
  }

  void _updateMapMarkers() {
    if (_mapController == null || !_isStyleLoaded) return;

    final salesCtrl = Get.find<SalesController>();
    final enterprises = salesCtrl.searchResults;

    _mapController?.clearSymbols();
    _mapController?.clearCircles();

    for (final ent in enterprises) {
      final isSelected = salesCtrl.selectedMapEnterprise.value?.id == ent.id;
      final colorHex = ent.isConverted
          ? '#10B981'
          : (isSelected ? '#FF7900' : '#D97706');

      _mapController?.addCircle(
        CircleOptions(
          geometry: LatLng(ent.latitude, ent.longitude),
          circleColor: colorHex,
          circleRadius: isSelected ? 10.0 : 7.0,
          circleStrokeColor: '#FFFFFF',
          circleStrokeWidth: isSelected ? 2.5 : 1.5,
          circleOpacity: 0.95,
        ),
        {'id': ent.id},
      );
    }
  }

  void _onPlaqueSelected(String plaque, SalesController salesController) {
    salesController.filterByPlaque(plaque);
    _updateMapMarkers();

    LatLng target;
    double zoom = 13.5;

    switch (plaque) {
      case 'KIN-GOMBE':
        target = _kinshasaGombeCenter;
        break;
      case 'KIN-LIMETE':
        target = _kinshasaLimeteCenter;
        break;
      case 'KIN-NGALIEMA':
        target = _kinshasaNgaliemaCenter;
        break;
      case 'LUBUMBASHI-01':
        target = _lubumbashiCenter;
        zoom = 12.5;
        break;
      default:
        target = _kinshasaGombeCenter;
        zoom = 12.8;
    }

    _mapController?.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(target: target, zoom: zoom),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final salesController = Get.find<SalesController>();
    final bool isTestEnv = Get.testMode ||
        WidgetsBinding.instance.runtimeType.toString().contains('Test');

    return Scaffold(
      body: Stack(
        children: [
          // 1. Moteur Cartographique Vectoriel MapLibre GL (Isolé par RepaintBoundary)
          if (isTestEnv)
            Container(
              color: isDark ? const Color(0xFF141416) : const Color(0xFFE2E8F0),
              child: const Center(
                child: Text('MapLibre Map'),
              ),
            )
          else
            RepaintBoundary(
              child: MapLibreMap(
                styleString: _getMapStyle(isDark),
                initialCameraPosition: const CameraPosition(
                  target: _kinshasaGombeCenter,
                  zoom: 13.0,
                ),
                onMapCreated: _onMapCreated,
                onStyleLoadedCallback: _onStyleLoaded,
                trackCameraPosition: true,
                myLocationEnabled: _hasLocationPermission,
                myLocationTrackingMode: MyLocationTrackingMode.none,
                myLocationRenderMode: MyLocationRenderMode.normal,
                compassEnabled: true,
              ),
            ),

          // 2. Header Flottant : Titre & Sélecteur de Plaque
          SafeArea(
            child: RepaintBoundary(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 8),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Barre Supérieure
                    GlassCard(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                      child: Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF222228) : const Color(0xFFE2E8F0),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isDark ? const Color(0x33FFFFFF) : const Color(0x1A000000),
                              ),
                            ),
                            child: Center(
                              child: Icon(LucideIcons.map, color: isDark ? Colors.white : AppConstants.textDark, size: 18),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Carte Territoire Orange B2B',
                              style: TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 15,
                                color: isDark ? Colors.white : AppConstants.textDark,
                              ),
                            ),
                          ),
                          Obx(() {
                            final unread = salesController.unreadNotificationsCount.value;
                            return ScaleTap(
                              onTap: () => _showNotificationsModal(context, isDark),
                              child: Stack(
                                clipBehavior: Clip.none,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: isDark ? const Color(0xFF222226) : const Color(0xFFF1F5F9),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(
                                      LucideIcons.bell,
                                      size: 18,
                                      color: isDark ? Colors.white : AppConstants.textDark,
                                    ),
                                  ),
                                  if (unread > 0)
                                    Positioned(
                                      top: -2,
                                      right: -2,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF2563EB),
                                          borderRadius: BorderRadius.circular(10),
                                          border: Border.all(color: isDark ? const Color(0xFF1C1C1E) : Colors.white, width: 1.5),
                                        ),
                                        child: Text(
                                          unread > 9 ? '9+' : '$unread',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 9,
                                            fontWeight: FontWeight.w900,
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            );
                          }),
                          const SizedBox(width: 6),
                          ScaleTap(
                            onTap: () => Get.toNamed(Routes.ENTERPRISE_SEARCH),
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF222226) : const Color(0xFFF1F5F9),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                LucideIcons.search,
                                size: 18,
                                color: isDark ? Colors.white : AppConstants.textDark,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Sélecteur de Plaques
                    SizedBox(
                      height: 34,
                      child: Obx(() {
                        final selectedPlaque = salesController.selectedPlaqueFilter.value;
                        final plaques = salesController.availablePlaques;

                        return ListView.builder(
                          scrollDirection: Axis.horizontal,
                          physics: const ClampingScrollPhysics(),
                          itemCount: plaques.length,
                          itemBuilder: (context, index) {
                            final plaque = plaques[index];
                            final isSelected = selectedPlaque == plaque;

                            return Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: ScaleTap(
                                onTap: () => _onPlaqueSelected(plaque, salesController),
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 150),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? (isDark ? Colors.white : const Color(0xFF18181B))
                                        : (isDark ? const Color(0xDD18181C) : const Color(0xF8FFFFFF)),
                                    borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                                    border: Border.all(
                                      color: isSelected
                                          ? (isDark ? Colors.white : const Color(0xFF18181B))
                                          : (isDark ? const Color(0x33FFFFFF) : AppConstants.borderLight),
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
                                        blurRadius: 6,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: Text(
                                    plaque == 'Toutes' ? 'Toutes les plaques' : plaque,
                                    style: TextStyle(
                                      color: isSelected
                                          ? (isDark ? const Color(0xFF121214) : Colors.white)
                                          : (isDark ? Colors.white : AppConstants.textDark),
                                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        );
                      }),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // 3. Bouton Flottant : Me Géolocaliser (Position temps réel avec halo bleu Google Maps)
          Positioned(
            right: 16,
            bottom: 165,
            child: ScaleTap(
              onTap: _recenterOnUser,
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xEE18181C) : Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isDark ? const Color(0x33FFFFFF) : AppConstants.borderLight,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.12),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Center(
                  child: Icon(
                    LucideIcons.locateFixed,
                    size: 20,
                    color: _hasLocationPermission
                        ? const Color(0xFF2563EB)
                        : (isDark ? Colors.white70 : AppConstants.textSecondaryLight),
                  ),
                ),
              ),
            ),
          ),

          // 4. Carte Flottante Inférieure : Entreprise Sélectionnée
          Positioned(
            left: 16,
            right: 16,
            bottom: 20,
            child: Obx(() {
              final selected = salesController.selectedMapEnterprise.value ??
                  (salesController.searchResults.isNotEmpty
                      ? salesController.searchResults.first
                      : null);

              if (selected == null) return const SizedBox.shrink();

              return RepaintBoundary(
                child: GlassCard(
                  padding: const EdgeInsets.all(14),
                  borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  selected.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 16,
                                    color: isDark ? Colors.white : AppConstants.textDark,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${selected.sector} • ${selected.location}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: selected.isConverted
                                  ? AppConstants.successGreen.withValues(alpha: 0.15)
                                  : AppConstants.accentYellow.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                              border: Border.all(
                                color: selected.isConverted ? AppConstants.successGreen : AppConstants.accentYellow,
                              ),
                            ),
                            child: Text(
                              selected.isConverted ? 'Converti' : 'À convertir',
                              style: TextStyle(
                                color: selected.isConverted ? AppConstants.successGreen : const Color(0xFFD97706),
                                fontWeight: FontWeight.w800,
                                fontSize: 10,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ScaleTap(
                              onTap: () {
                                salesController.selectEnterprise(selected);
                                AiBriefModal.show(context, selected);
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                                ),
                                child: Center(
                                  child: Text(
                                    'Voir le Débrief',
                                    style: TextStyle(
                                      color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ScaleTap(
                              onTap: () {
                                salesController.selectEnterprise(selected);
                                Get.toNamed(Routes.VISIT_PREPARATION);
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                decoration: BoxDecoration(
                                  color: isDark ? Colors.white : const Color(0xFF18181B),
                                  borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                                ),
                                child: Center(
                                  child: Text(
                                    'Démarrer Visite',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w900,
                                      color: isDark ? const Color(0xFF121214) : Colors.white,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  void _showNotificationsModal(BuildContext context, bool isDark) {
    final salesController = Get.find<SalesController>();
    salesController.fetchNotifications();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.7,
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 20,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Column(
            children: [
              // Poignée
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.black12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // En-tête modal
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(LucideIcons.bell, color: const Color(0xFF2563EB), size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Notifications Territoriales',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                        ),
                      ],
                    ),
                    TextButton(
                      onPressed: () => salesController.markAllNotificationsAsRead(),
                      child: const Text(
                        'Tout marquer lu',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF2563EB),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Liste des notifications
              Expanded(
                child: Obx(() {
                  if (salesController.isLoadingNotifications.value) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  final notifs = salesController.notifications;
                  if (notifs.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.bellOff, size: 40, color: Colors.grey.shade400),
                          const SizedBox(height: 12),
                          Text(
                            'Aucune notification pour le moment',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: isDark ? Colors.white60 : Colors.black54,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Les assignations de plaques et tracés KML apparaîtront ici.',
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? Colors.white38 : Colors.black38,
                            ),
                          ),
                        ],
                      ),
                    );
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: notifs.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, idx) {
                      final item = notifs[idx];
                      return ScaleTap(
                        onTap: () {
                          salesController.markNotificationAsRead(item.id);
                          if (item.plaqueCode.isNotEmpty) {
                            salesController.setFilterPlaque(item.plaqueCode);
                            // Centrer la carte si coordonnées disponibles
                            final center = item.payload['center'];
                            if (center != null && center['lon'] != null && center['lat'] != null) {
                              _mapController?.animateCamera(
                                CameraUpdate.newLatLng(
                                  LatLng((center['lat'] as num).toDouble(), (center['lon'] as num).toDouble()),
                                ),
                              );
                            }
                            Navigator.pop(ctx);
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: item.isRead
                                ? (isDark ? const Color(0xFF222226) : const Color(0xFFF8FAFC))
                                : (isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF)),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: item.isRead
                                  ? (isDark ? Colors.white10 : Colors.black.withValues(alpha: 0.05))
                                  : const Color(0xFF2563EB).withValues(alpha: 0.4),
                              width: item.isRead ? 1 : 1.5,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF2563EB),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          item.plaqueCode.isNotEmpty ? item.plaqueCode : 'ONBORA',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 10,
                                            fontWeight: FontWeight.w900,
                                          ),
                                        ),
                                      ),
                                      if (!item.isRead) ...[
                                        const SizedBox(width: 8),
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: const BoxDecoration(
                                            color: Color(0xFF2563EB),
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  if (item.createdAt != null)
                                    Text(
                                      '${item.createdAt!.hour.toString().padLeft(2, '0')}:${item.createdAt!.minute.toString().padLeft(2, '0')}',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: isDark ? Colors.white38 : Colors.black38,
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                item.title,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                item.message,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? Colors.white70 : Colors.black87,
                                  height: 1.4,
                                ),
                              ),
                              if (item.payload.containsKey('kml_url')) ...[
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Icon(LucideIcons.fileCode, size: 12, color: const Color(0xFF2563EB)),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Fichier KML & Tracé synchronisés sur votre carte',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  );
                }),
              ),
            ],
          ),
        );
      },
    );
  }
}
