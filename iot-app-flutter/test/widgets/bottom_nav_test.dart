import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iot_app_flutter/widgets/bottom_nav.dart';

void main() {
  testWidgets('active tab label stays centered within its tab item', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          bottomNavigationBar: BottomNav(
            activeTab: 'home',
            onChange: (_) {},
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final homeTab = find.byType(GestureDetector).first;
    final homeLabel = find.text('首页');

    final tabCenter = tester.getCenter(homeTab);
    final labelCenter = tester.getCenter(homeLabel);

    expect((labelCenter.dx - tabCenter.dx).abs(), lessThanOrEqualTo(12));
  });

  testWidgets('tab touch targets are large enough for reliable tapping', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          bottomNavigationBar: BottomNav(
            activeTab: 'home',
            onChange: (_) {},
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final firstTabSize = tester.getSize(find.byType(GestureDetector).first);

    expect(firstTabSize.height, greaterThanOrEqualTo(58));
    expect(firstTabSize.width, greaterThanOrEqualTo(80));
  });
}
