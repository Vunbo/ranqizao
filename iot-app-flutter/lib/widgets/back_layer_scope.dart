import 'package:flutter/material.dart';

class BackLayerScope extends StatelessWidget {
  const BackLayerScope({
    super.key,
    required this.hasActiveLayer,
    required this.onBack,
    required this.child,
  });

  final bool hasActiveLayer;
  final VoidCallback onBack;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return PopScope<void>(
      canPop: !hasActiveLayer,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && hasActiveLayer) {
          onBack();
        }
      },
      child: child,
    );
  }
}
