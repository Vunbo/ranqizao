import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iot_app_flutter/app/app_bootstrap.dart';

void main() {
  testWidgets('renders a loading shell before session init completes', (
    tester,
  ) async {
    final completer = Completer<void>();

    await tester.pumpWidget(
      AppBootstrap(
        initializeSessionStore: () => completer.future,
        child: const Directionality(
          textDirection: TextDirection.ltr,
          child: Text('ready'),
        ),
      ),
    );

    expect(find.byKey(const Key('app-bootstrap-loading')), findsOneWidget);
    expect(find.text('ready'), findsNothing);

    completer.complete();
    await tester.pump();
    await tester.pump();

    expect(find.text('ready'), findsOneWidget);
  });
}
