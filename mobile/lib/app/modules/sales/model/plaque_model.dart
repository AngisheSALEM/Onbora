import 'dart:math' as math;
import 'package:maplibre_gl/maplibre_gl.dart';

class PlaqueModel {
  final int id;
  final String code;
  final String name;
  final String city;
  final double latitude;
  final double longitude;
  final double radiusKm;
  final int totalEnterprises;
  final int readyCount;
  final List<String> assignedSalespersonsNames;
  final bool isActive;
  final Map<String, dynamic>? boundaryGeojson;
  final String? kmlData;
  final String? kmlUrl;

  PlaqueModel({
    required this.id,
    required this.code,
    required this.name,
    required this.city,
    required this.latitude,
    required this.longitude,
    this.radiusKm = 5.0,
    this.totalEnterprises = 0,
    this.readyCount = 0,
    this.assignedSalespersonsNames = const [],
    this.isActive = true,
    this.boundaryGeojson,
    this.kmlData,
    this.kmlUrl,
  });

  factory PlaqueModel.fromJson(Map<String, dynamic> json) {
    return PlaqueModel(
      id: json['id'] ?? 0,
      code: json['code'] ?? 'ZONE',
      name: json['name'] ?? 'Zone Commerciale',
      city: json['city'] ?? 'Kinshasa',
      latitude: (json['latitude'] ?? json['center_latitude'] as num?)?.toDouble() ?? -4.3033,
      longitude: (json['longitude'] ?? json['center_longitude'] as num?)?.toDouble() ?? 15.3083,
      radiusKm: (json['radius_km'] as num?)?.toDouble() ?? 5.0,
      totalEnterprises: json['total_enterprises'] ?? 0,
      readyCount: json['ready_count'] ?? 0,
      assignedSalespersonsNames: (json['assigned_salespersons_names'] as List?)?.map((e) => e.toString()).toList() ?? [],
      isActive: json['is_active'] ?? true,
      boundaryGeojson: json['boundary_geojson'] is Map<String, dynamic> ? json['boundary_geojson'] : null,
      kmlData: json['kml_data'],
      kmlUrl: json['kml_url'],
    );
  }

  List<LatLng> get polygonLatLngs {
    if (boundaryGeojson != null && boundaryGeojson!.containsKey('coordinates')) {
      final rawCoords = boundaryGeojson!['coordinates'];
      if (rawCoords is List && rawCoords.isNotEmpty) {
        final ring = rawCoords[0] is List && (rawCoords[0] as List).isNotEmpty && rawCoords[0][0] is List
            ? rawCoords[0] as List
            : rawCoords;
        final list = <LatLng>[];
        for (final pt in ring) {
          if (pt is List && pt.length >= 2) {
            final lng = (pt[0] as num).toDouble();
            final lat = (pt[1] as num).toDouble();
            list.add(LatLng(lat, lng));
          }
        }
        if (list.isNotEmpty) return list;
      }
    }
    // Fallback circle approximation around centroid
    final list = <LatLng>[];
    const numPts = 24;
    const latFactor = 111.32;
    for (int i = 0; i <= numPts; i++) {
      final angle = (2 * math.pi * i) / numPts;
      final dLat = (radiusKm) / latFactor;
      final dLng = (radiusKm) / (latFactor * math.cos(latitude * math.pi / 180));
      list.add(LatLng(latitude + dLat * math.sin(angle), longitude + dLng * math.cos(angle)));
    }
    return list;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'name': name,
      'city': city,
      'latitude': latitude,
      'longitude': longitude,
      'radius_km': radiusKm,
      'total_enterprises': totalEnterprises,
      'ready_count': readyCount,
      'assigned_salespersons_names': assignedSalespersonsNames,
      'is_active': isActive,
      'boundary_geojson': boundaryGeojson,
      'kml_data': kmlData,
      'kml_url': kmlUrl,
    };
  }
}
