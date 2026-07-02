import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants.dart';

class ApiClient {
  late final Dio _dio;

  ApiClient() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: const {
          'Content-Type': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = _token;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) {
          if (error.response?.statusCode == 401) {
            _onUnauthorized?.call();
          }
          handler.next(error);
        },
      ),
    );
  }

  String? _token;
  void Function()? _onUnauthorized;

  void setToken(String? token) {
    _token = token;
  }

  void onUnauthorized(void Function() callback) {
    _onUnauthorized = callback;
  }

  Future<Response<dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
  }) {
    return _dio.get(path, queryParameters: query);
  }

  Future<Response<dynamic>> post(
    String path, {
    dynamic data,
  }) {
    return _dio.post(path, data: data);
  }

  Future<Response<dynamic>> put(
    String path, {
    dynamic data,
  }) {
    return _dio.put(path, data: data);
  }

  Future<Response<dynamic>> patch(
    String path, {
    dynamic data,
  }) {
    return _dio.patch(path, data: data);
  }

  Future<Response<dynamic>> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? query,
  }) {
    return _dio.delete(
      path,
      data: data,
      queryParameters: query,
    );
  }
}

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

Map<String, dynamic> readResponseMap(dynamic data) {
  if (data is Map<String, dynamic>) {
    return data;
  }

  if (data is Map) {
    return data.map(
      (key, value) => MapEntry(key.toString(), value),
    );
  }

  return const {};
}

String extractErrorMessage(
  Object error, {
  String fallback = '请求失败',
}) {
  if (error is DioException) {
    final data = error.response?.data;
    final map = readResponseMap(data);
    final responseMessage = [
      map['message'],
      map['error'],
      data is String ? data : null,
      error.message,
    ].map((value) => value?.toString().trim() ?? '').firstWhere(
          (value) => value.isNotEmpty,
          orElse: () => '',
        );

    if (responseMessage.isNotEmpty) {
      return responseMessage;
    }
  }

  final text = error.toString().trim();
  if (text.startsWith('Exception: ')) {
    return text.substring('Exception: '.length).trim();
  }

  if (text.startsWith('FormatException: ')) {
    return text.substring('FormatException: '.length).trim();
  }

  return text.isNotEmpty ? text : fallback;
}
