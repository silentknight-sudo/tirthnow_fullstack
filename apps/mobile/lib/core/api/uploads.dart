import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'api_exception.dart';
import 'api_models.dart';

/// Presigned upload: ask the API for a URL, PUT the bytes, mark complete.
/// Returns the media id to pass to other endpoints.
Future<String> uploadMedia(
  ApiClient api, {
  required String purpose,
  required String mimeType,
  required Uint8List bytes,
  Dio? http,
}) async {
  final presign = asJson(
    await api.post(
      '/files/presign',
      body: PresignUploadDto(
        purpose: purpose,
        mimeType: mimeType,
        sizeBytes: bytes.length,
      ).toJson(),
    ),
  );
  final url = presign['uploadUrl'] as String;
  final headers =
      (presign['headers'] as Map?)?.cast<String, dynamic>() ?? {'Content-Type': mimeType};
  try {
    await (http ?? Dio()).put<void>(
      url,
      data: Stream.fromIterable([bytes]),
      options: Options(headers: {...headers, Headers.contentLengthHeader: bytes.length}),
    );
  } on DioException catch (e) {
    throw ApiException.fromDio(e);
  }
  final mediaId = presign['mediaId'] as String;
  await api.post('/files/$mediaId/complete');
  return mediaId;
}
