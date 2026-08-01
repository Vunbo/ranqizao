import 'package:flutter_test/flutter_test.dart';
import 'package:iot_app_flutter/features/mall/mall_webview_policy.dart';

void main() {
  group('isTrustedMallWebViewUri', () {
    final trustedUri = Uri.parse('https://h5.zyhskj.shop/');

    test('accepts pages from the configured HTTPS origin', () {
      final result = isTrustedMallWebViewUri(
        currentUri: Uri.parse(
          'https://h5.zyhskj.shop/subpackages/invite/index?scene=1#/scan',
        ),
        trustedMallUri: trustedUri,
      );

      expect(result, isTrue);
    });

    test('rejects HTTP, different ports, and deceptive host suffixes', () {
      expect(
        isTrustedMallWebViewUri(
          currentUri: Uri.parse('http://h5.zyhskj.shop/invite'),
          trustedMallUri: trustedUri,
        ),
        isFalse,
      );
      expect(
        isTrustedMallWebViewUri(
          currentUri: Uri.parse('https://h5.zyhskj.shop:8443/invite'),
          trustedMallUri: trustedUri,
        ),
        isFalse,
      );
      expect(
        isTrustedMallWebViewUri(
          currentUri: Uri.parse('https://h5.zyhskj.shop.attacker.test/invite'),
          trustedMallUri: trustedUri,
        ),
        isFalse,
      );
    });
  });

  group('resolveMallImageSelectionSource', () {
    test('uses the camera for the H5 capture image request', () {
      final source = resolveMallImageSelectionSource(
        isCaptureEnabled: true,
        isSingleSelection: true,
        acceptTypes: const ['image/*'],
      );

      expect(source, MallImageSelectionSource.camera);
    });

    test('uses the gallery for a regular single image request', () {
      final source = resolveMallImageSelectionSource(
        isCaptureEnabled: false,
        isSingleSelection: true,
        acceptTypes: const ['image/jpeg', 'image/png'],
      );

      expect(source, MallImageSelectionSource.gallery);
    });

    test('rejects non-image and multiple file requests', () {
      expect(
        resolveMallImageSelectionSource(
          isCaptureEnabled: true,
          isSingleSelection: true,
          acceptTypes: const ['application/pdf'],
        ),
        MallImageSelectionSource.unsupported,
      );
      expect(
        resolveMallImageSelectionSource(
          isCaptureEnabled: true,
          isSingleSelection: false,
          acceptTypes: const ['image/*'],
        ),
        MallImageSelectionSource.unsupported,
      );
    });
  });
}
