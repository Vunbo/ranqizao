import 'user.dart';

class QuickLoginProviderSupport {
  const QuickLoginProviderSupport({
    required this.supported,
    this.reason = '',
  });

  final bool supported;
  final String reason;
}

class AppQuickLoginSupport {
  const AppQuickLoginSupport({
    required this.wechatApp,
    required this.googleApp,
  });

  const AppQuickLoginSupport.empty()
      : wechatApp = const QuickLoginProviderSupport(
          supported: false,
        ),
        googleApp = const QuickLoginProviderSupport(
          supported: false,
        );

  factory AppQuickLoginSupport.unsupported(String reason) {
    return AppQuickLoginSupport(
      wechatApp: QuickLoginProviderSupport(
        supported: false,
        reason: reason,
      ),
      googleApp: QuickLoginProviderSupport(
        supported: false,
        reason: reason,
      ),
    );
  }

  final QuickLoginProviderSupport wechatApp;
  final QuickLoginProviderSupport googleApp;

  String get hint {
    if (!wechatApp.supported && wechatApp.reason.isNotEmpty) {
      return wechatApp.reason;
    }

    if (!googleApp.supported && googleApp.reason.isNotEmpty) {
      return googleApp.reason;
    }

    return '';
  }
}

class PhoneCodeSendResult {
  const PhoneCodeSendResult({
    this.debugCode,
  });

  final String? debugCode;

  factory PhoneCodeSendResult.fromJson(Map<String, dynamic> json) {
    final debugCode = _readNullableString(
      json['debugCode'] ?? json['debug_code'],
    );

    return PhoneCodeSendResult(
      debugCode: debugCode,
    );
  }
}

class AuthIdentity {
  const AuthIdentity({
    required this.provider,
    required this.providerUserId,
    required this.providerAppId,
    required this.isVerified,
    required this.isPrimary,
  });

  final String provider;
  final String providerUserId;
  final String providerAppId;
  final bool isVerified;
  final bool isPrimary;

  factory AuthIdentity.fromJson(Map<String, dynamic> json) {
    return AuthIdentity(
      provider: (json['provider'] ?? '').toString().trim(),
      providerUserId: (json['providerUserId'] ?? json['provider_user_id'] ?? '').toString().trim(),
      providerAppId: (json['providerAppId'] ?? json['provider_app_id'] ?? '').toString().trim(),
      isVerified: json['isVerified'] == true || json['is_verified'] == true,
      isPrimary: json['isPrimary'] == true || json['is_primary'] == true,
    );
  }
}

class AuthSessionPayload {
  const AuthSessionPayload({
    required this.token,
    required this.user,
  });

  final String token;
  final User user;

  factory AuthSessionPayload.fromJson(Map<String, dynamic> json) {
    final token = (json['token'] ?? '').toString().trim();
    if (token.isEmpty) {
      throw const FormatException('登录结果缺少 token');
    }

    final userJson = _readMap(json['user']);
    if (userJson.isEmpty) {
      throw const FormatException('登录结果缺少用户信息');
    }

    return AuthSessionPayload(
      token: token,
      user: User.fromJson(userJson),
    );
  }
}

Map<String, dynamic> _readMap(dynamic value) {
  if (value is Map<String, dynamic>) {
    return value;
  }

  if (value is Map) {
    return value.map(
      (key, item) => MapEntry(key.toString(), item),
    );
  }

  return const {};
}

String? _readNullableString(dynamic value) {
  final text = value?.toString().trim() ?? '';
  return text.isEmpty ? null : text;
}
