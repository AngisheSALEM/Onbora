import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:geolocator/geolocator.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:maplibre_gl/maplibre_gl.dart';
import '../controller/sales_controller.dart';
import 'widget/ai_brief_modal.dart';
import 'widget/notifications_modal.dart';
import '../../../routes/app_routes.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/glass_card.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../core/services/notification_service.dart';

/// Premier Onglet : Carte Vectorielle MapLibre GL + MapTiler
/// Télécharge uniquement les coordonnées géométriques (.pbf) compressées via CDN mondial,
/// et calcule le rendu en local sur GPU pour une fluidité 60-120 FPS et une consommation data minimale.
class PlaqueMapHomeScreen extends StatefulWidget {
  const PlaqueMapHomeScreen({super.key});

  @override
  State<PlaqueMapHomeScreen> createState() => _PlaqueMapHomeScreenState();
}

class _PlaqueMapHomeScreenState extends State<PlaqueMapHomeScreen>
    with WidgetsBindingObserver, AutomaticKeepAliveClientMixin {
  MapLibreMapController? _mapController;
  bool _isStyleLoaded = false;
  bool _hasLocationPermission = false;
  bool _isMapDark = false; // Par défaut : Thème clair pour une lisibilité maximale, indépendant du thème global
  final List<Worker> _workers = [];

  static const LatLng _kinshasaGombeCenter = LatLng(-4.3033, 15.3084);

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkAndRequestLocationPermission();

    final salesCtrl = Get.find<SalesController>();
    salesCtrl.fetchPlaques();

    _workers.add(ever(salesCtrl.plaquesList, (_) {
      if (mounted && _isStyleLoaded) {
        _updateMapMarkers();
      }
    }));
    _workers.add(ever(salesCtrl.activePlaqueCode, (_) {
      if (mounted && _isStyleLoaded) {
        _updateMapMarkers();
      }
    }));
    _workers.add(ever(salesCtrl.searchResults, (_) {
      if (mounted && _isStyleLoaded) {
        _updateMapMarkers();
      }
    }));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    for (final w in _workers) {
      w.dispose();
    }
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      debugPrint("[PlaqueMap] Reprise au premier plan : rafraîchissement des plaques...");
      Get.find<SalesController>().fetchPlaques();
    }
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

  String _getMapStyle(bool isDarkMap) {
    final apiKey = dotenv.env['MAPTILER_API_KEY'] ?? AppConstants.mapTilerApiKey;
    if (apiKey.isNotEmpty && apiKey != 'YOUR_MAPTILER_KEY') {
      return isDarkMap
          ? '${AppConstants.mapTilerDarkStyleUrl}$apiKey'
          : '${AppConstants.mapTilerStreetsStyleUrl}$apiKey';
    }
    // Style vectoriel 100% compatible Android & iOS
    return isDarkMap
        ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
        : AppConstants.mapLibreDemoStyleUrl;
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
    final plaques = salesCtrl.plaquesList;
    final activeCode = salesCtrl.activePlaqueCode.value;

    _mapController?.clearSymbols();
    _mapController?.clearCircles();
    _mapController?.clearFills();
    _mapController?.clearLines();

    // 1. Draw Back-Office GeoJSON Plaque Polygons / Layers
    for (final plaque in plaques) {
      final isSelectedPlaque = activeCode == 'Toutes' || activeCode == plaque.code;
      final pts = plaque.polygonLatLngs;
      if (pts.length >= 3) {
        final closedPts = List<LatLng>.from(pts);
        if (closedPts.first.latitude != closedPts.last.latitude || closedPts.first.longitude != closedPts.last.longitude) {
          closedPts.add(closedPts.first);
        }

        _mapController?.addFill(
          FillOptions(
            geometry: [closedPts],
            fillColor: '#2563EB',
            fillOpacity: isSelectedPlaque ? (activeCode == 'Toutes' ? 0.16 : 0.28) : 0.06,
            fillOutlineColor: '#2563EB',
          ),
        );
        _mapController?.addLine(
          LineOptions(
            geometry: closedPts,
            lineColor: '#2563EB',
            lineWidth: isSelectedPlaque ? 3.5 : 1.8,
            lineOpacity: isSelectedPlaque ? 0.95 : 0.45,
          ),
        );

        _mapController?.addCircle(
          CircleOptions(
            geometry: LatLng(plaque.latitude, plaque.longitude),
            circleColor: '#0F172A',
            circleRadius: isSelectedPlaque ? 8.0 : 6.0,
            circleStrokeColor: '#2563EB',
            circleStrokeWidth: 2.0,
            circleOpacity: 0.95,
          ),
        );
      }
    }

    // 2. Enterprise Lead Markers
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

  void _onPlaqueSelected(String plaqueCode, SalesController salesController) {
    salesController.filterByPlaque(plaqueCode);
    _updateMapMarkers();

    if (plaqueCode != 'Toutes') {
      final targetPlaque = salesController.plaquesList.firstWhereOrNull((p) => p.code == plaqueCode);
      if (targetPlaque != null) {
        _mapController?.animateCamera(
          CameraUpdate.newCameraPosition(
            CameraPosition(
              target: LatLng(targetPlaque.latitude, targetPlaque.longitude),
              zoom: 13.5,
            ),
          ),
        );
        return;
      }
    } else {
      if (salesController.plaquesList.isNotEmpty) {
        final firstP = salesController.plaquesList.first;
        _mapController?.animateCamera(
          CameraUpdate.newCameraPosition(
            CameraPosition(
              target: LatLng(firstP.latitude, firstP.longitude),
              zoom: 12.5,
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final salesController = Get.find<SalesController>();
    final bool isTestEnv = Get.testMode ||
        WidgetsBinding.instance.runtimeType.toString().contains('Test');

    return Scaffold(
      resizeToAvoidBottomInset: false,
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
                key: ValueKey('map_style_$_isMapDark'),
                styleString: _getMapStyle(_isMapDark),
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
                            ),
                            child: Center(
                              child: Icon(CupertinoIcons.map, color: isDark ? Colors.white : AppConstants.textDark, size: 18),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Map',
                              style: TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 16,
                                color: isDark ? Colors.white : AppConstants.textDark,
                              ),
                            ),
                          ),
                          // Bouton Synchronisation Instantanée des Plaques (Option 2)
                          Obx(() {
                            final isLoading = salesController.isLoadingPlaques.value;
                            return ScaleTap(
                              onTap: () async {
                                await salesController.fetchPlaques();
                                Get.snackbar(
                                  'Territoires synchronisés',
                                  'Les plaques et tracés cartographiques sont à jour.',
                                  snackPosition: SnackPosition.TOP,
                                  duration: const Duration(seconds: 2),
                                  margin: const EdgeInsets.all(12),
                                  backgroundColor: const Color(0xEE18181B),
                                  colorText: Colors.white,
                                  icon: const Icon(CupertinoIcons.checkmark_alt, color: Color(0xFF10B981)),
                                );
                              },
                              child: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF222226) : const Color(0xFFF1F5F9),
                                  shape: BoxShape.circle,
                                ),
                                child: isLoading
                                    ? SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(
                                            isDark ? Colors.white : AppConstants.textDark,
                                          ),
                                        ),
                                      )
                                    : Icon(
                                        CupertinoIcons.arrow_2_circlepath,
                                        size: 18,
                                        color: isDark ? Colors.white : AppConstants.textDark,
                                      ),
                              ),
                            );
                          }),
                          const SizedBox(width: 6),

                          // Notifications sur la Map
                          Obx(() {
                            final unread = salesController.unreadNotificationsCount.value;
                            final isOpen = salesController.isNotificationsOpen.value;
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
                                      isOpen ? CupertinoIcons.bell_fill : CupertinoIcons.bell,
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

                    // Bannière d'accès aux notifications push
                    if (Get.isRegistered<NotificationService>())
                      Obx(() {
                        final notifService = NotificationService.to;
                        if (notifService.hasPermission.value) {
                          return const SizedBox.shrink();
                        }
                        return Container(
                          margin: const EdgeInsets.only(top: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(CupertinoIcons.bell, color: isDark ? Colors.white : AppConstants.textDark, size: 16),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Activer les notifications push pour recevoir les plaques en temps réel',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? Colors.white : AppConstants.textDark,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              ScaleTap(
                                onTap: () => notifService.requestNotificationPermission(),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: AppConstants.primaryBtnColor(isDark),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    'Autoriser',
                                    style: TextStyle(
                                      color: AppConstants.primaryBtnTextColor(isDark),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                  ],
                ),
              ),
            ),
          ),

          // 3. Boutons Flottants : Thème Carte & Me Géolocaliser
          Positioned(
            right: 16,
            bottom: 255,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Bouton Thème Carte (Indépendant du thème global de l'app)
                ScaleTap(
                  onTap: () {
                    setState(() {
                      _isMapDark = !_isMapDark;
                      _isStyleLoaded = false;
                    });
                    Get.snackbar(
                      'Thème Carte',
                      _isMapDark ? 'Mode sombre activé sur la carte.' : 'Mode clair activé sur la carte.',
                      snackPosition: SnackPosition.TOP,
                      duration: const Duration(seconds: 2),
                      margin: const EdgeInsets.all(12),
                      backgroundColor: const Color(0xEE18181B),
                      colorText: Colors.white,
                      icon: Icon(
                        _isMapDark ? CupertinoIcons.moon : CupertinoIcons.sun_max,
                        color: _isMapDark ? const Color(0xFF60A5FA) : const Color(0xFFFBBF24),
                      ),
                    );
                  },
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xEE18181C) : Colors.white,
                      shape: BoxShape.circle,
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
                        _isMapDark ? CupertinoIcons.sun_max : CupertinoIcons.moon,
                        size: 20,
                        color: _isMapDark ? const Color(0xFFFBBF24) : (isDark ? Colors.white : AppConstants.textDark),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                // Bouton Me Géolocaliser
                ScaleTap(
                  onTap: _recenterOnUser,
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xEE18181C) : Colors.white,
                      shape: BoxShape.circle,
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
                        CupertinoIcons.location,
                        size: 20,
                        color: _hasLocationPermission
                            ? const Color(0xFF2563EB)
                            : (isDark ? Colors.white70 : AppConstants.textSecondaryLight),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 4. Carte Flottante Contextuelle Émergente (Au-dessus de la Tab Bar à 92px)
          Positioned(
            left: 16,
            right: 16,
            bottom: 92,
            child: Obx(() {
              final selected = salesController.selectedMapEnterprise.value;

              if (selected == null) return const SizedBox.shrink();

              return RepaintBoundary(
                child: GlassCard(
                  padding: const EdgeInsets.all(16),
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
                                  style: AppConstants.largeTitleStyle(isDark).copyWith(fontSize: 16),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${selected.sector} • ${selected.location}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppConstants.subheadStyle(isDark).copyWith(fontSize: 11),
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
                          const SizedBox(width: 6),
                          ScaleTap(
                            onTap: () => salesController.setMapEnterprise(null),
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                LucideIcons.x,
                                size: 14,
                                color: isDark ? Colors.white70 : AppConstants.textDark,
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
                                  color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                                  borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                                  border: Border.all(
                                    color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                                  ),
                                ),
                                child: Center(
                                  child: Text(
                                    'Voir le Débrief',
                                    style: TextStyle(
                                      color: isDark ? Colors.white : AppConstants.textDark,
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
                                  color: AppConstants.primaryBtnColor(isDark),
                                  borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                                ),
                                child: Center(
                                  child: Text(
                                    'Démarrer Visite',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                      color: AppConstants.primaryBtnTextColor(isDark),
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
    NotificationsModal.show(context, isDark: isDark, mapController: _mapController);
  }
}
