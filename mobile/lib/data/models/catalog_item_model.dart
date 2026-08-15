class CatalogItemModel {
  final int id;
  final String name;
  final String category;
  final String description;
  final double monthlyPrice;
  final double setupPrice;
  final bool isEligibleDefault;

  CatalogItemModel({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.monthlyPrice,
    required this.setupPrice,
    required this.isEligibleDefault,
  });

  factory CatalogItemModel.fromJson(Map<String, dynamic> json) {
    return CatalogItemModel(
      id: json['id'] as int? ?? 0,
      name: json['name'] as String? ?? 'Offre MSP',
      category: json['category'] as String? ?? 'Services',
      description: json['description'] as String? ?? '',
      monthlyPrice: (json['monthly_price'] as num?)?.toDouble() ?? 0.0,
      setupPrice: (json['setup_price'] as num?)?.toDouble() ?? 0.0,
      isEligibleDefault: json['is_eligible_default'] as bool? ?? true,
    );
  }
}
