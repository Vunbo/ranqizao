import 'runtime_config.dart';

class ApiConstants {
  static String get baseUrl => RuntimeConfig.apiBaseUrl;

  static const String authRegister = '/auth/register';
  static const String authLogin = '/auth/login';
  static const String authPhoneSendCode = '/auth/phone/send-code';
  static const String authPhoneLogin = '/auth/phone/login';
  static String get authMiniProgramLogin => RuntimeConfig.miniProgramLoginPath;
  static String get authWechatLogin => RuntimeConfig.appWechatLoginPath;
  static String get authBindWechatApp => RuntimeConfig.bindWechatAppPath;
  static String get authGoogleLogin => RuntimeConfig.appGoogleLoginPath;
  static String get authBindGoogleApp => RuntimeConfig.bindGoogleAppPath;
  static const String authMe = '/auth/me';
  static const String authIdentities = '/auth/identities';
  static const String authBindEmail = '/auth/bind/email';
  static const String authBindPhoneSendCode = '/auth/bind/phone/send-code';
  static const String authBindPhone = '/auth/bind/phone';
  static const String authBindMiniProgram = '/auth/bind/mini-program';
  static const String authUnbindPhoneSendCode = '/auth/unbind/phone/send-code';
  static const String authUnbind = '/auth/unbind';
  static const String authLogout = '/auth/logout';
  static const String authPasswordChange = '/auth/password/change';
  static const String authSecondaryVerify = '/auth/secondary-verify';

  static const String devices = '/devices';
  static String deviceDetail(String id) => '/devices/$id';
  static const String deviceBindScan = '/devices/bind/scan';
  static const String deviceBind = '/devices/bind';
  static String deviceCommand(String id, String cmd) => '/devices/$id/commands/$cmd';
  static String deviceLogs(String id) => '/devices/$id/logs';
  static String deviceShare(String id) => '/devices/$id/share';
  static String deviceShareMember(String id, String userId) => '/devices/$id/share/$userId';

  static const String homes = '/homes';
  static String homeDetail(String id) => '/homes/$id';
  static String homeDeviceLinks(String id) => '/homes/$id/device-links';
  static String homeMembers(String id) => '/homes/$id/members';

  static const String alerts = '/alerts';
  static String alertDetail(String id) => '/alerts/$id';
  static String alertRead(String id) => '/alerts/$id/read';
  static String alertAck(String id) => '/alerts/$id/ack';

  static const String merchantSummary = '/merchant/me';
  static const String merchantPage = '/merchant/page';
  static const String merchantPanel = '/merchant/panel';
  static const String merchantApplications = '/merchant/applications';
}
