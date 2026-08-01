import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

typedef ExitAppCallback = Future<void> Function();

class AppExitController {
  AppExitController({
    this.confirmationWindow = const Duration(seconds: 2),
  });

  final Duration confirmationWindow;
  DateTime? _lastBackPressedAt;

  bool registerBackPress({DateTime? now}) {
    final pressedAt = now ?? DateTime.now();
    final previous = _lastBackPressedAt;
    if (previous != null &&
        pressedAt.difference(previous) <= confirmationWindow) {
      _lastBackPressedAt = null;
      return true;
    }

    _lastBackPressedAt = pressedAt;
    return false;
  }

  void reset() {
    _lastBackPressedAt = null;
  }
}

final exitAppCallbackProvider = Provider<ExitAppCallback>(
  (_) => () => SystemNavigator.pop(),
);

final appExitControllerProvider = Provider<AppExitController>(
  (_) => AppExitController(),
);
