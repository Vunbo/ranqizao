import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_icon.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  bool _isLogin = true;
  String _authMethod = 'email';
  String? _localError;
  bool _isSendingPhoneCode = false;

  final _emailCtrl = TextEditingController();
  final _pwdCtrl = TextEditingController();
  final _confirmPwdCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _phoneCodeCtrl = TextEditingController();

  Timer? _countdownTimer;
  int _phoneCountdown = 0;

  String get _submitText {
    if (_isLogin) {
      return _authMethod == 'phone' ? '手机号登录' : '登录';
    }

    return '注册';
  }

  String get _phoneCountdownText {
    if (_phoneCountdown > 0) {
      return '${_phoneCountdown}s 后重发';
    }

    return '发送验证码';
  }

  bool get _passwordMismatch {
    return !_isLogin &&
        _pwdCtrl.text.isNotEmpty &&
        _confirmPwdCtrl.text.isNotEmpty &&
        _pwdCtrl.text != _confirmPwdCtrl.text;
  }

  bool get _isFormValid {
    if (_authMethod == 'phone') {
      return _phoneCtrl.text.trim().isNotEmpty &&
          _phoneCodeCtrl.text.trim().isNotEmpty;
    }

    if (_isLogin) {
      return _emailCtrl.text.trim().isNotEmpty && _pwdCtrl.text.isNotEmpty;
    }

    return _emailCtrl.text.trim().isNotEmpty &&
        _pwdCtrl.text.isNotEmpty &&
        _confirmPwdCtrl.text.isNotEmpty &&
        !_passwordMismatch;
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _emailCtrl.dispose();
    _pwdCtrl.dispose();
    _confirmPwdCtrl.dispose();
    _phoneCtrl.dispose();
    _phoneCodeCtrl.dispose();
    super.dispose();
  }

  void _toggleAuthMode() {
    ref.read(authProvider.notifier).clearError();
    _resetPhoneCountdown();
    setState(() {
      _isLogin = !_isLogin;
      _authMethod = 'email';
      _localError = null;
      _pwdCtrl.clear();
      _confirmPwdCtrl.clear();
      _phoneCodeCtrl.clear();
    });
  }

  void _switchAuthMethod(String method) {
    if (_authMethod == method) {
      return;
    }

    ref.read(authProvider.notifier).clearError();
    _resetPhoneCountdown();
    setState(() {
      _authMethod = method;
      _localError = null;
    });
  }

  void _handleFieldChanged(String _) {
    if (!_isLogin || (_localError?.isNotEmpty ?? false)) {
      setState(() {
        _localError = null;
      });
    }
  }

  void _showMessage(String message) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  void _startPhoneCountdown() {
    _countdownTimer?.cancel();
    setState(() {
      _phoneCountdown = 60;
    });

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || _phoneCountdown <= 1) {
        timer.cancel();
        if (mounted) {
          setState(() {
            _phoneCountdown = 0;
          });
        }
        return;
      }

      setState(() {
        _phoneCountdown -= 1;
      });
    });
  }

  void _resetPhoneCountdown() {
    _countdownTimer?.cancel();
    _phoneCountdown = 0;
  }

  Future<void> _sendPhoneCode() async {
    final authState = ref.read(authProvider);
    if (authState.isLoading || _isSendingPhoneCode || _phoneCountdown > 0) {
      return;
    }

    final phone = _phoneCtrl.text.trim();
    if (phone.isEmpty) {
      setState(() {
        _localError = '请输入手机号';
      });
      return;
    }

    ref.read(authProvider.notifier).clearError();
    setState(() {
      _localError = null;
      _isSendingPhoneCode = true;
    });

    try {
      final notifier = ref.read(authProvider.notifier);
      final result = _isLogin
          ? await notifier.sendPhoneLoginCode(phone)
          : await notifier.sendPhoneRegistrationCode(phone);
      if (!mounted || result == null) {
        return;
      }

      _startPhoneCountdown();
      final message = result.debugCode?.isNotEmpty == true
          ? '验证码已发送，当前调试验证码：${result.debugCode}'
          : '验证码已发送';
      _showMessage(message);
    } finally {
      if (mounted) {
        setState(() {
          _isSendingPhoneCode = false;
        });
      }
    }
  }

  Future<void> _submit() async {
    final authState = ref.read(authProvider);
    if (authState.isLoading || !_isFormValid) {
      return;
    }

    final notifier = ref.read(authProvider.notifier);
    notifier.clearError();
    if (_localError != null) {
      setState(() {
        _localError = null;
      });
    }

    if (_authMethod == 'phone') {
      if (_isLogin) {
        await notifier.loginWithPhoneCode(
          _phoneCtrl.text.trim(),
          _phoneCodeCtrl.text.trim(),
        );
      } else {
        await notifier.registerWithPhoneCode(
          _phoneCtrl.text.trim(),
          _phoneCodeCtrl.text.trim(),
        );
      }
      return;
    }

    if (_isLogin) {
      await notifier.loginWithPassword(
        email: _emailCtrl.text.trim(),
        password: _pwdCtrl.text,
      );
      return;
    }

    await notifier.registerWithPassword(
      email: _emailCtrl.text.trim(),
      password: _pwdCtrl.text,
    );
  }

  Future<void> _handleWechatQuickLogin() async {
    final notifier = ref.read(authProvider.notifier);
    final success = await notifier.loginWithWechatApp();
    if (!mounted || success) {
      return;
    }

    final message = ref.read(authProvider).error;
    if (message != null && message.isNotEmpty) {
      _showMessage(message);
      notifier.clearError();
    }
  }

  Future<void> _handleGoogleQuickLogin() async {
    final notifier = ref.read(authProvider.notifier);
    final success = await notifier.loginWithGoogleApp();
    if (!mounted || success) {
      return;
    }

    final message = ref.read(authProvider).error;
    if (message != null && message.isNotEmpty) {
      _showMessage(message);
      notifier.clearError();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final quickLoginHint = authState.quickLoginSupport.hint;
    final formError =
        (_localError?.isNotEmpty ?? false) ? _localError : authState.error;

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          24,
          MediaQuery.of(context).padding.top + 34,
          24,
          48,
        ),
        child: Center(
          child: SizedBox(
            width: 380,
            child: Column(
              children: [
                _buildBrand(),
                const SizedBox(height: 28),
                _buildSwitchBar(),
                const SizedBox(height: 18),
                ...(_authMethod == 'email'
                    ? _buildEmailForm()
                    : _buildPhoneForm(authState.isLoading)),
                if (formError != null && formError.isNotEmpty)
                  _buildErrorText(formError),
                if (_passwordMismatch) _buildErrorText('两次输入的密码不一致'),
                _buildSubmitButton(
                  loading: authState.isLoading && !_isSendingPhoneCode,
                  disabled: authState.isLoading,
                ),
                _buildFooter(),
                if (_isLogin) ...[
                  const SizedBox(height: 24),
                  _buildDivider(),
                  const SizedBox(height: 16),
                  _buildQuickLogin(authState.isLoading),
                  if (quickLoginHint.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(
                        quickLoginHint,
                        style: const TextStyle(
                          fontSize: 12,
                          height: 1.6,
                          color: AppColors.danger,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBrand() {
    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.24),
                blurRadius: 28,
                offset: const Offset(0, 14),
              ),
            ],
          ),
          child: const Center(
            child: AppIcon(
              name: 'flame',
              size: 28,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'AI 安全灶',
          style: TextStyle(
            fontFamily: 'Outfit',
            fontSize: 24,
            fontWeight: FontWeight.w700,
            color: AppColors.slate900,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          _isLogin ? '欢迎回来' : '创建您的账户',
          style: const TextStyle(
            fontSize: 14,
            color: AppColors.slate500,
          ),
        ),
      ],
    );
  }

  Widget _buildSwitchBar() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.slate200,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          _buildSwitchItem(
            label: _isLogin ? '邮箱登录' : '邮箱注册',
            method: 'email',
          ),
          _buildSwitchItem(
            label: _isLogin ? '手机号登录' : '手机号注册',
            method: 'phone',
          ),
        ],
      ),
    );
  }

  Widget _buildSwitchItem({
    required String label,
    required String method,
  }) {
    final active = _authMethod == method;

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => _switchAuthMethod(method),
        child: Container(
          height: 40,
          decoration: BoxDecoration(
            color: active ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            boxShadow: active
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: active ? AppColors.primary : AppColors.slate500,
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildEmailForm() {
    return [
      _buildField(
        label: '邮箱地址',
        icon: 'mail',
        controller: _emailCtrl,
        hint: '请输入邮箱，例如 123@test.com',
      ),
      const SizedBox(height: 14),
      _buildField(
        label: '密码',
        icon: 'lock',
        controller: _pwdCtrl,
        hint: '请输入密码',
        obscureText: true,
      ),
      if (!_isLogin) ...[
        const SizedBox(height: 14),
        _buildField(
          label: '确认密码',
          icon: 'lock',
          controller: _confirmPwdCtrl,
          hint: '请再次输入密码',
          obscureText: true,
        ),
      ],
    ];
  }

  List<Widget> _buildPhoneForm(bool loading) {
    final disabled = loading || _phoneCountdown > 0;

    return [
      _buildLabel('手机号码'),
      const SizedBox(height: 6),
      Row(
        children: [
          Expanded(
            child: _buildInput(
              icon: 'phone',
              controller: _phoneCtrl,
              hint: '+86 138...',
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () {
              unawaited(_sendPhoneCode());
            },
            child: Container(
              constraints: const BoxConstraints(
                minWidth: 104,
                minHeight: 52,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: disabled
                    ? AppColors.slate100.withValues(alpha: 0.6)
                    : AppColors.slate100,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Center(
                child: _isSendingPhoneCode
                    ? const Row(
                        key: Key('phone-code-loading'),
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.slate700,
                            ),
                          ),
                          SizedBox(width: 6),
                          Text(
                            '发送中',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.slate700,
                            ),
                          ),
                        ],
                      )
                    : Text(
                        _phoneCountdownText,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.slate700,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
      const SizedBox(height: 14),
      _buildField(
        label: '验证码',
        icon: 'lock',
        controller: _phoneCodeCtrl,
        hint: '请输入 6 位验证码',
      ),
    ];
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: AppColors.slate700,
        ),
      ),
    );
  }

  Widget _buildField({
    required String label,
    required String icon,
    required TextEditingController controller,
    required String hint,
    bool obscureText = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel(label),
        const SizedBox(height: 6),
        _buildInput(
          icon: icon,
          controller: controller,
          hint: hint,
          obscureText: obscureText,
        ),
      ],
    );
  }

  Widget _buildInput({
    required String icon,
    required TextEditingController controller,
    required String hint,
    bool obscureText = false,
  }) {
    return Container(
      constraints: const BoxConstraints(minHeight: 52),
      padding: const EdgeInsets.only(left: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.slate200),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: AppIcon(
              name: icon,
              size: 16,
              color: AppColors.textSecondary,
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(right: 14),
              child: TextField(
                controller: controller,
                obscureText: obscureText,
                onChanged: _handleFieldChanged,
                decoration: InputDecoration(
                  hintText: hint,
                  hintStyle: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 14,
                  ),
                  filled: false,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  disabledBorder: InputBorder.none,
                  errorBorder: InputBorder.none,
                  focusedErrorBorder: InputBorder.none,
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(vertical: 16),
                ),
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.slate900,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorText(String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AppColors.danger,
        ),
      ),
    );
  }

  Widget _buildSubmitButton({
    required bool loading,
    required bool disabled,
  }) {
    return Padding(
      padding: const EdgeInsets.only(top: 18),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: disabled ? null : _submit,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.72),
            disabledForegroundColor: Colors.white,
            minimumSize: const Size(0, 52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            elevation: 0,
            shadowColor: AppColors.primary.withValues(alpha: 0.24),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (loading)
                const Padding(
                  padding: EdgeInsets.only(right: 6),
                  child: SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  ),
                ),
              Text(
                loading ? '处理中...' : _submitText,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFooter() {
    final actionText = _isLogin ? '立即注册' : '立即登录';

    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            _isLogin ? '还没有账号？' : '已经有账号？',
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.slate500,
            ),
          ),
          GestureDetector(
            onTap: _toggleAuthMode,
            child: Padding(
              padding: const EdgeInsets.only(left: 6),
              child: Text(
                actionText,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return const Row(
      children: [
        Expanded(
          child: Divider(
            color: AppColors.slate200,
            height: 1,
          ),
        ),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            '快捷登录',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 2,
              color: AppColors.textSecondary,
            ),
          ),
        ),
        Expanded(
          child: Divider(
            color: AppColors.slate200,
            height: 1,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickLogin(bool loading) {
    final support = ref.watch(authProvider).quickLoginSupport;

    return Row(
      children: [
        Expanded(
          child: _buildQuickLoginItem(
            icon: const AppIcon(
              name: 'message',
              size: 18,
              color: Color(0xFF07C160),
              filled: true,
            ),
            label: '微信',
            disabled: loading || !support.wechatApp.supported,
            onTap: _handleWechatQuickLogin,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildQuickLoginItem(
            icon: Container(
              width: 20,
              height: 20,
              decoration: const BoxDecoration(
                color: Color(0xFF4285F4),
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Text(
                  'G',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            label: 'Google',
            disabled: loading || !support.googleApp.supported,
            onTap: _handleGoogleQuickLogin,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickLoginItem({
    required Widget icon,
    required String label,
    required bool disabled,
    required Future<void> Function() onTap,
  }) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        unawaited(onTap());
      },
      child: Opacity(
        opacity: disabled ? 0.48 : 1,
        child: Container(
          constraints: const BoxConstraints(minHeight: 52),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: AppColors.slate200),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              icon,
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.slate700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
