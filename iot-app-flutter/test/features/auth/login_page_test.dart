import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:iot_app_flutter/app/app.dart';
import 'package:iot_app_flutter/services/api_client.dart';
import 'package:iot_app_flutter/services/session_store.dart';

class _HangingApiClient extends ApiClient {
  final Completer<Response<dynamic>> request = Completer<Response<dynamic>>();

  @override
  Future<Response<dynamic>> post(
    String path, {
    dynamic data,
  }) {
    return request.future;
  }
}

Finder _textFieldWithHint(String hint) {
  return find.byWidgetPredicate(
    (widget) => widget is TextField && widget.decoration?.hintText == hint,
  );
}

void main() {
  late Directory hiveDirectory;

  setUpAll(() async {
    hiveDirectory = await Directory.systemTemp.createTemp('iot-auth-test-');
    Hive.init(hiveDirectory.path);
    await Hive.openBox<String>(SessionStore.boxName);
  });

  tearDownAll(() async {
    await Hive.close();
    await hiveDirectory.delete(recursive: true);
  });

  test('connection timeout uses a user-facing Chinese message', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/auth/phone/send-code'),
      type: DioExceptionType.connectionTimeout,
      message: 'The request connection took longer than 0:00:10.000000',
    );

    expect(
      extractErrorMessage(error, fallback: '发送验证码失败'),
      '连接服务器超时，请检查网络后重试。',
    );
  });

  testWidgets('sending a phone code keeps the phone login form mounted', (
    tester,
  ) async {
    final api = _HangingApiClient();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWithValue(api),
        ],
        child: const RanqiZaoApp(),
      ),
    );
    await tester.pumpAndSettle();

    final emailField = _textFieldWithHint('请输入邮箱，例如 123@test.com');
    final emailInput = tester.widget<TextField>(emailField);
    expect(emailInput.decoration?.enabledBorder, InputBorder.none);
    expect(emailInput.decoration?.focusedBorder, InputBorder.none);

    await tester.tap(find.text('手机号登录').first);
    await tester.pump();

    final phoneField = _textFieldWithHint('+86 138...');
    expect(phoneField, findsOneWidget);

    await tester.enterText(phoneField, '13800138000');
    await tester.tap(find.text('发送验证码'));
    await tester.pump();
    await tester.pump();

    expect(phoneField, findsOneWidget);
    expect(_textFieldWithHint('请输入邮箱，例如 123@test.com'), findsNothing);
    expect(find.byKey(const Key('phone-code-loading')), findsOneWidget);
    expect(find.text('发送中'), findsOneWidget);
    expect(find.text('处理中...'), findsNothing);

    await tester.pumpWidget(const SizedBox.shrink());
  });
}
