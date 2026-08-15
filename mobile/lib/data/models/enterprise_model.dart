class EnterpriseModel {
  final int id;
  final String name;
  final String? website;
  final String? sector;
  final String? approximateSize;
  final String? location;
  final String? siren;
  final String? siret;
  final String? syncStatus;
  final String? kaabuOrganizationId;

  EnterpriseModel({
    required this.id,
    required this.name,
    this.website,
    this.sector,
    this.approximateSize,
    this.location,
    this.siren,
    this.siret,
    this.syncStatus,
    this.kaabuOrganizationId,
  });

  factory EnterpriseModel.fromJson(Map<String, dynamic> json) {
    return EnterpriseModel(
      id: json['id'] as int? ?? 0,
      name: json['name'] as String? ?? 'Entreprise sans nom',
      website: json['website'] as String?,
      sector: json['sector'] as String? ?? 'Services',
      approximateSize: json['approximate_size'] as String? ?? '2-19 employés',
      location: json['location'] as String? ?? 'Kinshasa / RDC',
      siren: json['siren'] as String?,
      siret: json['siret'] as String?,
      syncStatus: json['sync_status'] as String?,
      kaabuOrganizationId: json['kaabu_organization_id'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'website': website,
    'sector': sector,
    'approximate_size': approximateSize,
    'location': location,
    'siren': siren,
    'siret': siret,
    'sync_status': syncStatus,
    'kaabu_organization_id': kaabuOrganizationId,
  };
}
