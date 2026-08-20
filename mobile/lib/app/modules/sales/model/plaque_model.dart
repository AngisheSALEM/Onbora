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
  });

  factory PlaqueModel.fromJson(Map<String, dynamic> json) {
    return PlaqueModel(
      id: json['id'] ?? 0,
      code: json['code'] ?? 'KIN-GOMBE',
      name: json['name'] ?? 'Kinshasa (Gombe)',
      city: json['city'] ?? 'Kinshasa',
      latitude: (json['latitude'] ?? json['center_latitude'] as num?)?.toDouble() ?? -4.3033,
      longitude: (json['longitude'] ?? json['center_longitude'] as num?)?.toDouble() ?? 15.3083,
      radiusKm: (json['radius_km'] as num?)?.toDouble() ?? 5.0,
      totalEnterprises: json['total_enterprises'] ?? 0,
      readyCount: json['ready_count'] ?? 0,
      assignedSalespersonsNames: (json['assigned_salespersons_names'] as List?)?.map((e) => e.toString()).toList() ?? [],
      isActive: json['is_active'] ?? true,
    );
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
    };
  }
}
