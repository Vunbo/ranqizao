import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/navigation/app_back_interceptor_registry.dart';
import '../core/navigation/app_exit_controller.dart';

class AppRootBackScope extends ConsumerStatefulWidget {
  const AppRootBackScope({
    super.key,
    required this.child,
    this.onBeforeExit,
  });

  final Widget child;
  final AppBackInterceptor? onBeforeExit;

  @override
  ConsumerState<AppRootBackScope> createState() => _AppRootBackScopeState();
}

class _AppRootBackScopeState extends ConsumerState<AppRootBackScope> {
  bool _isHandlingBack = false;

  Future<void> _handleBack() async {
    if (_isHandlingBack) {
      return;
    }

    _isHandlingBack = true;
    try {
      if (await widget.onBeforeExit?.call() == true) {
        ref.read(appExitControllerProvider).reset();
        return;
      }
      if (!mounted) {
        return;
      }

      final controller = ref.read(appExitControllerProvider);
      if (controller.registerBackPress()) {
        await ref.read(exitAppCallbackProvider).call();
        return;
      }

      final messenger = ScaffoldMessenger.maybeOf(context);
      messenger
        ?..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('再按一次退出应用'),
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
    } finally {
      _isHandlingBack = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope<void>(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          unawaited(_handleBack());
        }
      },
      child: widget.child,
    );
  }
}
