class OcrDocumentResultModel {
  String companyName;
  String rccm;
  String nif;
  String contactName;
  String contactTitle;
  String phone;
  String email;
  String address;
  String currentProvider;
  String currentBandwidth;
  double? monthlySpendEstimated;
  String detectedType;
  String rawText;
  double confidenceScore;

  OcrDocumentResultModel({
    this.companyName = '',
    this.rccm = '',
    this.nif = '',
    this.contactName = '',
    this.contactTitle = '',
    this.phone = '',
    this.email = '',
    this.address = '',
    this.currentProvider = '',
    this.currentBandwidth = '',
    this.monthlySpendEstimated,
    this.detectedType = 'GENERAL',
    this.rawText = '',
    this.confidenceScore = 0.95,
  });

  factory OcrDocumentResultModel.fromJson(Map<String, dynamic> json) {
    final spendRaw = json['monthly_spend_estimated'];
    double? spend;
    if (spendRaw != null) {
      if (spendRaw is num) {
        spend = spendRaw.toDouble();
      } else {
        spend = double.tryParse(spendRaw.toString());
      }
    }

    return OcrDocumentResultModel(
      companyName: json['company_name'] as String? ?? '',
      rccm: json['rccm'] as String? ?? '',
      nif: json['nif'] as String? ?? '',
      contactName: json['contact_name'] as String? ?? '',
      contactTitle: json['contact_title'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      email: json['email'] as String? ?? '',
      address: json['address'] as String? ?? '',
      currentProvider: json['current_provider'] as String? ?? '',
      currentBandwidth: json['current_bandwidth'] as String? ?? '',
      monthlySpendEstimated: spend,
      detectedType: json['detected_type'] as String? ?? 'GENERAL',
      rawText: json['raw_text'] as String? ?? '',
      confidenceScore: (json['confidence_score'] as num?)?.toDouble() ?? 0.95,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'company_name': companyName,
      'rccm': rccm,
      'nif': nif,
      'contact_name': contactName,
      'contact_title': contactTitle,
      'phone': phone,
      'email': email,
      'address': address,
      'current_provider': currentProvider,
      'current_bandwidth': currentBandwidth,
      'monthly_spend_estimated': monthlySpendEstimated,
      'detected_type': detectedType,
      'raw_text': rawText,
      'confidence_score': confidenceScore,
    };
  }
}
