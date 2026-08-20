class CommonResponseModel<T> {
  final bool success;
  final String message;
  final T? data;
  final int? statusCode;

  CommonResponseModel({
    required this.success,
    required this.message,
    this.data,
    this.statusCode,
  });

  factory CommonResponseModel.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic json) fromJsonT,
  ) {
    return CommonResponseModel(
      success: json['success'] ?? true,
      message: json['detail'] ?? json['message'] ?? '',
      data: json['data'] != null ? fromJsonT(json['data']) : null,
      statusCode: json['status_code'],
    );
  }
}
