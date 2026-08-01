import 'package:flutter_test/flutter_test.dart';
import 'package:iot_app_flutter/features/mall/mall_url.dart';

void main() {
  group('buildMallRequestUri', () {
    test('adds the verified mobile number to the mall URL', () {
      final uri = buildMallRequestUri(
        baseUrl: 'https://h5.zyhskj.shop/',
        phone: '176 2909-9038',
        phoneLoginEnabled: true,
        phoneQueryParameter: 'phone',
      );

      expect(uri.host, 'h5.zyhskj.shop');
      expect(uri.queryParameters['phone'], '17629099038');
    });

    test('preserves existing query parameters and hash route', () {
      final uri = buildMallRequestUri(
        baseUrl: 'https://example.com/shop?menu=1#/home?i=1',
        phone: '17629099038',
        phoneLoginEnabled: true,
        phoneQueryParameter: 'phone',
      );

      expect(uri.queryParameters['menu'], '1');
      expect(uri.queryParameters['phone'], '17629099038');
      expect(uri.fragment, '/home?i=1');
    });

    test('does not add a phone when temporary login is disabled', () {
      final uri = buildMallRequestUri(
        baseUrl: 'https://h5.zyhskj.shop/',
        phone: '17629099038',
        phoneLoginEnabled: false,
        phoneQueryParameter: 'phone',
      );

      expect(uri.queryParameters.containsKey('phone'), isFalse);
    });

    test('does not add a missing or invalid phone', () {
      final missingPhoneUri = buildMallRequestUri(
        baseUrl: 'https://h5.zyhskj.shop/',
        phone: null,
        phoneLoginEnabled: true,
        phoneQueryParameter: 'phone',
      );
      final invalidPhoneUri = buildMallRequestUri(
        baseUrl: 'https://h5.zyhskj.shop/',
        phone: '12345',
        phoneLoginEnabled: true,
        phoneQueryParameter: 'phone',
      );

      expect(missingPhoneUri.queryParameters.containsKey('phone'), isFalse);
      expect(invalidPhoneUri.queryParameters.containsKey('phone'), isFalse);
    });
  });
}
