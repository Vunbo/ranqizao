import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/auth_models.dart';
import '../models/user.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/session_store.dart';

enum AuthStatus {
  uninitialized,
  authenticated,
  unauthenticated,
}

class AuthState {
  const AuthState({
    this.status = AuthStatus.uninitialized,
    this.user,
    this.token,
    this.isLoading = false,
    this.error,
    this.quickLoginSupport = const AppQuickLoginSupport.empty(),
  });

  static const Object _unset = Object();

  final AuthStatus status;
  final User? user;
  final String? token;
  final bool isLoading;
  final String? error;
  final AppQuickLoginSupport quickLoginSupport;

  bool get isLoggedIn => status == AuthStatus.authenticated;
  bool get isReady => status != AuthStatus.uninitialized;

  AuthState copyWith({
    AuthStatus? status,
    Object? user = _unset,
    Object? token = _unset,
    bool? isLoading,
    Object? error = _unset,
    AppQuickLoginSupport? quickLoginSupport,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: identical(user, _unset) ? this.user : user as User?,
      token: identical(token, _unset) ? this.token : token as String?,
      isLoading: isLoading ?? this.isLoading,
      error: identical(error, _unset) ? this.error : error as String?,
      quickLoginSupport: quickLoginSupport ?? this.quickLoginSupport,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(
    this._authService,
    this._api,
    this._sessionStore,
  ) : super(const AuthState()) {
    _api.onUnauthorized(() {
      unawaited(_handleUnauthorized());
    });
    unawaited(_loadQuickLoginSupport());
    unawaited(_bootstrap());
  }

  final AuthService _authService;
  final ApiClient _api;
  final SessionStore _sessionStore;

  Future<void> _bootstrap() async {
    final token = _sessionStore.getAuthToken();
    if (token.isEmpty) {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        quickLoginSupport: state.quickLoginSupport,
      );
      return;
    }

    _api.setToken(token);

    try {
      final user = await _authService.getCurrentUser();
      state = AuthState(
        status: AuthStatus.authenticated,
        user: user,
        token: token,
        quickLoginSupport: state.quickLoginSupport,
      );
    } catch (_) {
      await _clearSession();
    }
  }

  Future<void> _loadQuickLoginSupport() async {
    try {
      final support = await _authService.getAvailableAppQuickLoginProviders();
      state = state.copyWith(quickLoginSupport: support);
    } catch (_) {
      state = state.copyWith(
        quickLoginSupport: AppQuickLoginSupport.unsupported(
          '快捷登录能力加载失败',
        ),
      );
    }
  }

  Future<PhoneCodeSendResult?> sendPhoneLoginCode(String phone) async {
    state = state.copyWith(
      isLoading: true,
      error: null,
    );

    try {
      final result = await _authService.sendPhoneLoginCode(phone);
      state = state.copyWith(
        isLoading: false,
        error: null,
      );
      return result;
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: extractErrorMessage(
          error,
          fallback: '发送验证码失败',
        ),
      );
      return null;
    }
  }

  Future<PhoneCodeSendResult?> sendPhoneRegistrationCode(String phone) async {
    state = state.copyWith(
      isLoading: true,
      error: null,
    );

    try {
      final result = await _authService.sendPhoneRegistrationCode(phone);
      state = state.copyWith(
        isLoading: false,
        error: null,
      );
      return result;
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: extractErrorMessage(
          error,
          fallback: '发送验证码失败',
        ),
      );
      return null;
    }
  }

  Future<bool> loginWithPhoneCode(
    String phone,
    String code,
  ) async {
    state = state.copyWith(
      isLoading: true,
      error: null,
    );

    try {
      final session = await _authService.loginWithPhoneCode(phone, code);
      await _completeAuth(session);
      return true;
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: extractErrorMessage(
          error,
          fallback: '认证失败，请检查输入内容。',
        ),
      );
      return false;
    }
  }

  Future<bool> registerWithPhoneCode(
    String phone,
    String code,
  ) async {
    state = state.copyWith(
      isLoading: true,
      error: null,
    );

    try {
      final session = await _authService.registerWithPhoneCode(phone, code);
      await _completeAuth(session);
      return true;
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: extractErrorMessage(
          error,
          fallback: '注册失败，请检查输入内容。',
        ),
      );
      return false;
    }
  }

  Future<bool> loginWithPassword({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(
      isLoading: true,
      error: null,
    );

    try {
      final session = await _authService.loginWithPassword(
        email: email,
        password: password,
      );
      await _completeAuth(session);
      return true;
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: extractErrorMessage(
          error,
          fallback: '认证失败，请检查输入内容。',
        ),
      );
      return false;
    }
  }

  Future<bool> registerWithPassword({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(
      isLoading: true,
      error: null,
    );

    try {
      final session = await _authService.registerWithPassword(
        email: email,
        password: password,
      );
      await _completeAuth(session);
      return true;
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: extractErrorMessage(
          error,
          fallback: '认证失败，请检查输入内容。',
        ),
      );
      return false;
    }
  }

  Future<bool> loginWithWechatApp() async {
    final reason = state.quickLoginSupport.wechatApp.reason;
    if (!state.quickLoginSupport.wechatApp.supported) {
      state = state.copyWith(
        error: reason.isNotEmpty ? reason : '当前环境不可用微信快捷登录',
      );
      return false;
    }

    state = state.copyWith(
      isLoading: true,
      error: null,
    );

    try {
      final session = await _authService.loginWithWechatApp();
      await _completeAuth(session);
      return true;
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: extractErrorMessage(
          error,
          fallback: '微信登录失败',
        ),
      );
      return false;
    }
  }

  Future<bool> loginWithGoogleApp() async {
    final reason = state.quickLoginSupport.googleApp.reason;
    if (!state.quickLoginSupport.googleApp.supported) {
      state = state.copyWith(
        error: reason.isNotEmpty ? reason : '当前环境不可用 Google 快捷登录',
      );
      return false;
    }

    state = state.copyWith(
      isLoading: true,
      error: null,
    );

    try {
      final session = await _authService.loginWithGoogleApp();
      await _completeAuth(session);
      return true;
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: extractErrorMessage(
          error,
          fallback: 'Google 登录失败',
        ),
      );
      return false;
    }
  }

  Future<bool> updateDisplayName(String displayName) async {
    state = state.copyWith(
      isLoading: true,
      error: null,
    );

    try {
      final user = await _authService.updateCurrentUserProfile(
        displayName: displayName,
      );
      state = state.copyWith(
        user: user,
        isLoading: false,
        error: null,
      );
      return true;
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: extractErrorMessage(
          error,
          fallback: '名称修改失败',
        ),
      );
      return false;
    }
  }

  void clearError() {
    if (state.error == null) {
      return;
    }

    state = state.copyWith(error: null);
  }

  Future<void> refreshCurrentUser({
    bool notifyOnError = false,
  }) async {
    if (state.status != AuthStatus.authenticated) {
      return;
    }

    try {
      final user = await _authService.getCurrentUser();
      state = state.copyWith(
        user: user,
        error: notifyOnError ? null : state.error,
      );
    } catch (error) {
      if (!notifyOnError) {
        return;
      }

      state = state.copyWith(
        error: extractErrorMessage(
          error,
          fallback: '用户信息刷新失败',
        ),
      );
    }
  }

  Future<void> logout({
    bool remote = true,
  }) async {
    final support = state.quickLoginSupport;

    try {
      if (remote) {
        await _authService.logout();
      }
    } catch (_) {
      // Keep local logout durable even when the remote logout endpoint fails.
    } finally {
      _api.setToken(null);
      await _sessionStore.clearStoredSession();
      state = AuthState(
        status: AuthStatus.unauthenticated,
        quickLoginSupport: support,
      );
    }
  }

  Future<void> _completeAuth(AuthSessionPayload session) async {
    _api.setToken(session.token);
    await _sessionStore.persistAuthToken(session.token);
    state = AuthState(
      status: AuthStatus.authenticated,
      user: session.user,
      token: session.token,
      quickLoginSupport: state.quickLoginSupport,
    );
  }

  Future<void> _clearSession() async {
    _api.setToken(null);
    await _sessionStore.clearStoredSession();
    state = AuthState(
      status: AuthStatus.unauthenticated,
      quickLoginSupport: state.quickLoginSupport,
    );
  }

  Future<void> _handleUnauthorized() async {
    if (state.status == AuthStatus.unauthenticated) {
      return;
    }

    await logout(remote: false);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authService = ref.watch(authServiceProvider);
  final api = ref.watch(apiClientProvider);
  final sessionStore = ref.watch(sessionStoreProvider);
  return AuthNotifier(authService, api, sessionStore);
});
