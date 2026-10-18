import 'package:dio/dio.dart';

/// A client-facing API error, normalised from `{ error: { code, message } }`.
class ApiException implements Exception {
  const ApiException({required this.code, required this.message, this.status, this.requestId});

  /// Builds an [ApiException] from any Dio failure.
  factory ApiException.fromDio(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['error'] is Map) {
      final err = (data['error'] as Map).cast<String, dynamic>();
      return ApiException(
        code: (err['code'] as String?) ?? 'INTERNAL',
        message: (err['message'] as String?) ?? 'Something went wrong',
        status: e.response?.statusCode,
        requestId: err['requestId'] as String?,
      );
    }
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.connectionError:
        return const ApiException(code: 'NETWORK', message: 'No internet connection');
      default:
        return ApiException(
          code: 'INTERNAL',
          message: 'Something went wrong',
          status: e.response?.statusCode,
        );
    }
  }

  final String code;
  final String message;
  final int? status;
  final String? requestId;

  bool get isNetwork => code == 'NETWORK';
  bool get isUnauthorized => status == 401;

  @override
  String toString() => 'ApiException($code, $message)';
}
