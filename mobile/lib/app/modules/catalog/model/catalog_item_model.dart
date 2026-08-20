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
    this.isEligibleDefault = true,
  });

  factory CatalogItemModel.fromJson(Map<String, dynamic> json) {
    return CatalogItemModel(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      category: json['category'] ?? 'Général',
      description: json['description'] ?? '',
      monthlyPrice: (json['monthly_price'] as num?)?.toDouble() ?? 0.0,
      setupPrice: (json['setup_price'] as num?)?.toDouble() ?? 0.0,
      isEligibleDefault: json['is_eligible_default'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'description': description,
      'monthly_price': monthlyPrice,
      'setup_price': setupPrice,
      'is_eligible_default': isEligibleDefault,
    };
  }
}
