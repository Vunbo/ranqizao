import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants.dart';
import '../models/auth_models.dart';
import '../models/user.dart';
import 'api_client.dart';

class AuthService {
  const AuthService(this._api);

  final ApiClient _api;

  Future<PhoneCodeSendResult> sendPhoneLoginCode(String phone) async {
    final res = await _api.post(
      ApiConstants.authPhoneSendCode,
      data: {
        'phone': phone,
        'purpose': 'login',
      },
    );
    return PhoneCodeSendResult.fromJson(readResponseMap(res.data));
  }

  Future<AuthSessionPayload> loginWithPhoneCode(
    String phone,
    String code,
  ) async {
    final res = await _api.post(
      ApiConstants.authPhoneLogin,
      data: {
        'phone': phone,
        'code': code,
      },
    );
    return AuthSessionPayload.fromJson(readResponseMap(res.data));
  }

  Future<AuthSessionPayload> loginWithPassword({
    required String email,
    required String password,
  }) async {
    final res = await _api.post(
      ApiConstants.authLogin,
      data: {
        'email': email,
        'password': password,
      },
    );
    return AuthSessionPayload.fromJson(readResponseMap(res.data));
  }

  Future<AuthSessionPayload> registerWithPassword({
    required String email,
    required String password,
  }) async {
    final res = await _api.post(
      ApiConstants.authRegister,
      data: {
        'email': email,
        'password': password,
      },
    );
    return AuthSessionPayload.fromJson(readResponseMap(res.data));
  }

  Future<User> getCurrentUser() async {
    final res = await _api.get(ApiConstants.authMe);
    final data = readResponseMap(res.data);
    return User.fromJson(readResponseMap(data['user']));
  }

  Future<User> updateCurrentUserProfile({
    required String displayName,
  }) async {
    final res = await _api.patch(
      ApiConstants.authMe,
      data: {
        'displayName': displayName,
      },
    );
    final data = readResponseMap(res.data);
    return User.fromJson(readResponseMap(data['user']));
  }

  Future<List<AuthIdentity>> listAuthIdentities() async {
    final res = await _api.get(ApiConstants.authIdentities);
    final data = readResponseMap(res.data);
    final raw = data['identities'];
    if (raw is! List) {
      return const <AuthIdentity>[];
    }

    return raw
        .map((item) => AuthIdentity.fromJson(readResponseMap(item)))
        .toList(growable: false);
  }

  Future<void> bindEmailIdentity({
    required String email,
    required String password,
  }) async {
    await _api.post(
      ApiConstants.authBindEmail,
      data: {
        'email': email,
        'password': password,
      },
    );
  }

  Future<PhoneCodeSendResult> sendPhoneBindCode(String phone) async {
    final res = await _api.post(
      ApiConstants.authBindPhoneSendCode,
      data: {
        'phone': phone,
      },
    );
    return PhoneCodeSendResult.fromJson(readResponseMap(res.data));
  }

  Future<PhoneCodeSendResult> sendPhoneUnbindCode(String phone) async {
    final res = await _api.post(
      ApiConstants.authUnbindPhoneSendCode,
      data: {
        'phone': phone,
      },
    );
    return PhoneCodeSendResult.fromJson(readResponseMap(res.data));
  }

  Future<void> bindPhoneIdentity({
    required String phone,
    required String code,
  }) async {
    await _api.post(
      ApiConstants.authBindPhone,
      data: {
        'phone': phone,
        'code': code,
      },
    );
  }

  Future<void> bindMiniProgramIdentity() async {
    throw Exception('当前平台不支持微信小程序绑定');
  }

  Future<void> bindWechatAppIdentity() async {
    throw Exception('当前 Flutter 版本暂未接入原生微信 App 绑定');
  }

  Future<void> bindGoogleAppIdentity() async {
    throw Exception('当前 Flutter 版本暂未接入原生 Google 绑定');
  }

  Future<Map<String, dynamic>> resolveUnbindVerificationPayload(
    String verificationType,
  ) async {
    switch (verificationType) {
      case 'wechat_mini_program':
        throw Exception('当前平台不支持微信小程序二次校验');
      case 'wechat_app':
        throw Exception('当前 Flutter 版本暂未接入原生微信 App 二次校验');
      case 'google_app':
        throw Exception('当前 Flutter 版本暂未接入原生 Google 二次校验');
      default:
        return const <String, dynamic>{};
    }
  }

  Future<void> unbindIdentity(Map<String, dynamic> payload) async {
    await _api.post(ApiConstants.authUnbind, data: payload);
  }

  Future<AppQuickLoginSupport> getAvailableAppQuickLoginProviders() async {
    const reason = '当前 Flutter 版本暂未接入原生微信/Google 快捷登录';
    return AppQuickLoginSupport.unsupported(reason);
  }

  Future<AuthSessionPayload> loginWithWechatApp() async {
    throw Exception('当前 Flutter 版本暂未接入原生微信快捷登录');
  }

  Future<AuthSessionPayload> loginWithGoogleApp() async {
    throw Exception('当前 Flutter 版本暂未接入原生 Google 快捷登录');
  }

  Future<void> logout() async {
    await _api.post(ApiConstants.authLogout);
  }

  Future<void> changePassword(
    String currentPassword,
    String newPassword,
  ) async {
    await _api.post(
      ApiConstants.authPasswordChange,
      data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      },
    );
  }

  Future<Map<String, dynamic>> secondaryVerify(String password) async {
    final res = await _api.post(
      ApiConstants.authSecondaryVerify,
      data: {
        'password': password,
      },
    );
    return readResponseMap(res.data);
  }
}

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(ref.watch(apiClientProvider));
});
