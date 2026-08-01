import 'package:flutter_test/flutter_test.dart';
import 'package:iot_app_flutter/core/navigation/app_exit_controller.dart';

void main() {
  test('requires two back presses inside the confirmation window', () {
    final controller = AppExitController();
    final firstPress = DateTime(2026, 8, 1, 12);

    expect(controller.registerBackPress(now: firstPress), isFalse);
    expect(
      controller.registerBackPress(
        now: firstPress.add(const Duration(milliseconds: 1500)),
      ),
      isTrue,
    );
  });

  test('an expired or reset confirmation requires a new first press', () {
    final controller = AppExitController();
    final firstPress = DateTime(2026, 8, 1, 12);

    expect(controller.registerBackPress(now: firstPress), isFalse);
    expect(
      controller.registerBackPress(
        now: firstPress.add(const Duration(seconds: 3)),
      ),
      isFalse,
    );

    controller.reset();
    expect(
      controller.registerBackPress(
        now: firstPress.add(const Duration(seconds: 4)),
      ),
      isFalse,
    );
  });
}
