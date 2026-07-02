import 'package:flutter_test/flutter_test.dart';
import 'package:iot_app_flutter/core/theme.dart';
import 'package:iot_app_flutter/widgets/app_icon.dart';

void main() {
  test('decimal stroke widths map to the existing icon asset naming rule', () {
    expect(
      buildIconAssetPath(
        name: 'flame',
        color: AppColors.primary,
        filled: false,
        strokeWidth: 2.5,
      ),
      'assets/icons/flame-f97316-f0-s2_5.svg',
    );
  });
}
