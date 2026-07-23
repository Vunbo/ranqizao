class RuntimeConfig {
  const RuntimeConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'VITE_API_BASE_URL',
    defaultValue: 'http://192.168.105.103:3001/api',
  );

  static const String miniProgramLoginPath = String.fromEnvironment(
    'VITE_MINI_PROGRAM_LOGIN_PATH',
    defaultValue: '/auth/mini-program/login',
  );

  static const String appWechatLoginPath = String.fromEnvironment(
    'VITE_WECHAT_APP_LOGIN_PATH',
    defaultValue: '/auth/wechat/app/login',
  );

  static const String bindWechatAppPath = String.fromEnvironment(
    'VITE_BIND_WECHAT_APP_PATH',
    defaultValue: '/auth/bind/wechat/app',
  );

  static const String appGoogleLoginPath = String.fromEnvironment(
    'VITE_GOOGLE_APP_LOGIN_PATH',
    defaultValue: '/auth/google/app/login',
  );

  static const String bindGoogleAppPath = String.fromEnvironment(
    'VITE_BIND_GOOGLE_APP_PATH',
    defaultValue: '/auth/bind/google/app',
  );

  static const String mallH5Url = String.fromEnvironment(
    'VITE_MALL_H5_URL',
    defaultValue: 'https://zyhskj.shop/addons/yun_shop/?menu#/home?i=1',
  );
}
