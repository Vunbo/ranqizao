import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

enum AppRootSection { home, safety, mall, profile }

typedef AppBackInterceptor = FutureOr<bool> Function();

class AppBackInterceptorRegistry {
  final Map<AppRootSection, AppBackInterceptor> _interceptors = {};

  void register(
    AppRootSection section,
    AppBackInterceptor interceptor,
  ) {
    _interceptors[section] = interceptor;
  }

  void unregister(
    AppRootSection section,
    AppBackInterceptor interceptor,
  ) {
    if (identical(_interceptors[section], interceptor)) {
      _interceptors.remove(section);
    }
  }

  Future<bool> handle(AppRootSection section) async {
    return await _interceptors[section]?.call() == true;
  }
}

final appBackInterceptorRegistryProvider =
    Provider<AppBackInterceptorRegistry>((_) => AppBackInterceptorRegistry());
