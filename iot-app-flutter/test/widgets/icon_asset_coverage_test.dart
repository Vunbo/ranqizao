import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iot_app_flutter/core/theme.dart';
import 'package:iot_app_flutter/widgets/app_icon.dart';

void main() {
  test('critical icon variants used by the UI exist on disk', () {
    final assetPaths = [
      buildIconAssetPath(
        name: 'flame',
        color: AppColors.primary,
        filled: false,
        strokeWidth: 2.5,
      ),
      buildIconAssetPath(
        name: 'shield',
        color: AppColors.primary,
        filled: false,
        strokeWidth: 2.5,
      ),
      buildIconAssetPath(
        name: 'bag',
        color: AppColors.primary,
        filled: false,
        strokeWidth: 2.5,
      ),
      buildIconAssetPath(
        name: 'user',
        color: AppColors.primary,
        filled: false,
        strokeWidth: 2.5,
      ),
      buildIconAssetPath(
        name: 'flame',
        color: AppColors.success,
        filled: false,
        strokeWidth: 2,
      ),
      buildIconAssetPath(
        name: 'flame',
        color: AppColors.slate600,
        filled: false,
        strokeWidth: 2,
      ),
      buildIconAssetPath(
        name: 'info',
        color: AppColors.textSecondary,
        filled: false,
        strokeWidth: 2,
      ),
      buildIconAssetPath(
        name: 'user',
        color: Colors.white,
        filled: false,
        strokeWidth: 2,
      ),
    ];

    for (final assetPath in assetPaths) {
      expect(
        File(assetPath).existsSync(),
        isTrue,
        reason: 'Missing icon asset: $assetPath',
      );
    }
  });
}
