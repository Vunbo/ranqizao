import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme.dart';
import '../../../models/auth_models.dart';
import '../../../providers/auth_provider.dart';
import '../../../services/api_client.dart';
import '../../../services/auth_service.dart';
import '../../../widgets/app_icon.dart';
import 'profile_subview_scaffold.dart';

class AccountManagementView extends ConsumerStatefulWidget {
  const AccountManagementView({
    super.key,
    required this.onBack,
    required this.onMessage,
  });

  final VoidCallback onBack;
  final void Function(String message, {required bool isError}) onMessage;

  @override
  ConsumerState<AccountManagementView> createState() =>
      _AccountManagementViewState();
}

class _AccountManagementViewState extends ConsumerState<AccountManagementView> {
  static const Color _wechatGreen = Color(0xFF07C160);

  final TextEditingController _currentPasswordController =
      TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  final TextEditingController _bindEmailController = TextEditingController();
  final TextEditingController _bindEmailPasswordController =
      TextEditingController();
  final TextEditingController _bindPhoneController = TextEditingController();
  final TextEditingController _bindPhoneCodeController = TextEditingController();
  final TextEditingController _unbindPasswordController =
      TextEditingController();
  final TextEditingController _unbindPhoneController = TextEditingController();
  final TextEditingController _unbindCodeController = TextEditingController();

  Timer? _bindPhoneTimer;
  Timer? _unbindPhoneTimer;

  List<AuthIdentity> _identities = const <AuthIdentity>[];
  bool _hasLoadedIdentities = false;
  bool _isLoadingIdentities = false;
  bool _isSubmittingIdentity = false;
  bool _isSubmittingPassword = false;
  bool _emailModalOpen = false;
  bool _phoneModalOpen = false;
  bool _unbindModalOpen = false;
  int _bindPhoneCountdown = 0;
  int _unbindPhoneCountdown = 0;
  String _passwordError = '';
  String _unbindVerifyMethod = '';
  _IdentityCardData? _unbindTarget;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadIdentities);
  }

  @override
  void dispose() {
    _bindPhoneTimer?.cancel();
    _unbindPhoneTimer?.cancel();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    _bindEmailController.dispose();
    _bindEmailPasswordController.dispose();
    _bindPhoneController.dispose();
    _bindPhoneCodeController.dispose();
    _unbindPasswordController.dispose();
    _unbindPhoneController.dispose();
    _unbindCodeController.dispose();
    super.dispose();
  }

  List<_IdentityCardData> get _identityCards => _buildIdentityCards(_identities);

  List<_VerifyMethodOption> get _availableVerifyMethods =>
      _buildVerifyMethods(_identities, _unbindTarget);

  String get _bindPhoneCountdownText =>
      _formatCountdownText(_bindPhoneCountdown);

  String get _unbindPhoneCountdownText =>
      _formatCountdownText(_unbindPhoneCountdown);

  Future<void> _loadIdentities({bool showError = true}) async {
    if (_isLoadingIdentities) {
      return;
    }

    setState(() {
      _isLoadingIdentities = true;
    });

    try {
      final identities = await ref.read(authServiceProvider).listAuthIdentities();
      if (!mounted) {
        return;
      }

      setState(() {
        _identities = identities;
        _hasLoadedIdentities = true;
        if (_unbindTarget != null) {
          final nextTarget = _findMatchingCard(identities, _unbindTarget!);
          _unbindTarget = nextTarget;
          if (nextTarget == null) {
            _clearUnbindState();
          } else {
            final methods = _buildVerifyMethods(identities, nextTarget);
            if (!methods.any((item) => item.key == _unbindVerifyMethod)) {
              _unbindVerifyMethod = methods.isNotEmpty ? methods.first.key : '';
            }
          }
        }
      });
    } catch (error) {
      if (showError) {
        widget.onMessage(
          extractErrorMessage(error, fallback: '加载绑定信息失败'),
          isError: true,
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingIdentities = false;
        });
      }
    }
  }

  Future<void> _refreshAfterIdentityMutation() async {
    await Future.wait<void>([
      _loadIdentities(showError: false),
      ref.read(authProvider.notifier).refreshCurrentUser(),
    ]);
  }

  Future<void> _submitChangePassword() async {
    if (_isSubmittingPassword) {
      return;
    }

    final currentPassword = _currentPasswordController.text.trim();
    final newPassword = _newPasswordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    if (currentPassword.isEmpty || newPassword.isEmpty || confirmPassword.isEmpty) {
      setState(() {
        _passwordError = '请完整填写密码信息';
      });
      return;
    }

    if (newPassword != confirmPassword) {
      setState(() {
        _passwordError = '两次输入的新密码不一致';
      });
      return;
    }

    setState(() {
      _isSubmittingPassword = true;
      _passwordError = '';
    });

    try {
      await ref.read(authServiceProvider).changePassword(
            currentPassword,
            newPassword,
          );
      if (!mounted) {
        return;
      }

      _currentPasswordController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();
      widget.onMessage('密码修改成功', isError: false);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _passwordError = extractErrorMessage(error, fallback: '修改密码失败');
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmittingPassword = false;
        });
      }
    }
  }

  void _handleIdentityAction(_IdentityCardData item) {
    if (_isSubmittingIdentity || item.actionDisabled) {
      return;
    }

    if (item.bound) {
      _openUnbindModal(item);
      return;
    }

    switch (item.key) {
      case 'email':
        setState(() {
          _emailModalOpen = true;
        });
        return;
      case 'phone':
        setState(() {
          _phoneModalOpen = true;
        });
        return;
      case 'wechat':
        unawaited(
          _runIdentityMutation(
            action: () => ref.read(authServiceProvider).bindMiniProgramIdentity(),
            successMessage: '微信小程序身份绑定成功',
            failureFallback: '微信小程序身份绑定失败',
          ),
        );
        return;
      case 'wechatApp':
        unawaited(
          _runIdentityMutation(
            action: () => ref.read(authServiceProvider).bindWechatAppIdentity(),
            successMessage: '微信 App 身份绑定成功',
            failureFallback: '微信 App 身份绑定失败',
          ),
        );
        return;
      case 'googleApp':
        unawaited(
          _runIdentityMutation(
            action: () => ref.read(authServiceProvider).bindGoogleAppIdentity(),
            successMessage: 'Google 身份绑定成功',
            failureFallback: 'Google 身份绑定失败',
          ),
        );
        return;
    }
  }

  Future<void> _runIdentityMutation({
    required Future<void> Function() action,
    required String successMessage,
    required String failureFallback,
    VoidCallback? onSuccess,
  }) async {
    if (_isSubmittingIdentity) {
      return;
    }

    setState(() {
      _isSubmittingIdentity = true;
    });

    try {
      await action();
      onSuccess?.call();
      await _refreshAfterIdentityMutation();
      if (!mounted) {
        return;
      }
      widget.onMessage(successMessage, isError: false);
    } catch (error) {
      if (!mounted) {
        return;
      }
      widget.onMessage(
        extractErrorMessage(error, fallback: failureFallback),
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSubmittingIdentity = false;
        });
      }
    }
  }
  Future<void> _submitBindEmail() async {
    final email = _bindEmailController.text.trim();
    final password = _bindEmailPasswordController.text.trim();
    if (email.isEmpty || password.isEmpty) {
      widget.onMessage('请完整填写邮箱绑定信息', isError: true);
      return;
    }

    await _runIdentityMutation(
      action: () => ref.read(authServiceProvider).bindEmailIdentity(
            email: email,
            password: password,
          ),
      successMessage: '邮箱绑定成功',
      failureFallback: '邮箱绑定失败',
      onSuccess: () => _closeEmailModal(force: true),
    );
  }

  Future<void> _sendBindPhoneVerificationCode() async {
    if (_isSubmittingIdentity || _bindPhoneCountdown > 0) {
      return;
    }

    final phone = _bindPhoneController.text.trim();
    if (phone.isEmpty) {
      widget.onMessage('请输入手机号', isError: true);
      return;
    }

    setState(() {
      _isSubmittingIdentity = true;
    });

    try {
      final result = await ref.read(authServiceProvider).sendPhoneBindCode(phone);
      if (!mounted) {
        return;
      }
      _startBindPhoneCountdown();
      widget.onMessage(
        result.debugCode?.isNotEmpty == true
            ? '验证码已发送，当前调试验证码：${result.debugCode}'
            : '验证码已发送',
        isError: false,
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      widget.onMessage(
        extractErrorMessage(error, fallback: '发送验证码失败'),
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSubmittingIdentity = false;
        });
      }
    }
  }

  Future<void> _submitBindPhone() async {
    final phone = _bindPhoneController.text.trim();
    final code = _bindPhoneCodeController.text.trim();
    if (phone.isEmpty || code.isEmpty) {
      widget.onMessage('请完整填写手机号绑定信息', isError: true);
      return;
    }

    await _runIdentityMutation(
      action: () => ref.read(authServiceProvider).bindPhoneIdentity(
            phone: phone,
            code: code,
          ),
      successMessage: '手机号绑定成功',
      failureFallback: '手机号绑定失败',
      onSuccess: () => _closePhoneModal(force: true),
    );
  }

  void _openUnbindModal(_IdentityCardData item) {
    final methods = _buildVerifyMethods(_identities, item);
    setState(() {
      _unbindTarget = item;
      _unbindModalOpen = true;
      _unbindVerifyMethod = methods.isNotEmpty ? methods.first.key : '';
      _unbindPasswordController.clear();
      _unbindPhoneController.clear();
      _unbindCodeController.clear();
    });
  }

  void _selectVerifyMethod(String key) {
    if (_isSubmittingIdentity) {
      return;
    }

    setState(() {
      _unbindVerifyMethod = key;
    });
  }

  Future<void> _sendUnbindPhoneVerificationCode() async {
    if (_isSubmittingIdentity || _unbindPhoneCountdown > 0) {
      return;
    }

    final phone = _unbindPhoneController.text.trim();
    if (phone.isEmpty) {
      widget.onMessage('请输入已绑定手机号', isError: true);
      return;
    }

    setState(() {
      _isSubmittingIdentity = true;
    });

    try {
      final result =
          await ref.read(authServiceProvider).sendPhoneUnbindCode(phone);
      if (!mounted) {
        return;
      }
      _startUnbindPhoneCountdown();
      widget.onMessage(
        result.debugCode?.isNotEmpty == true
            ? '验证码已发送，当前调试验证码：${result.debugCode}'
            : '验证码已发送',
        isError: false,
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      widget.onMessage(
        extractErrorMessage(error, fallback: '发送验证码失败'),
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSubmittingIdentity = false;
        });
      }
    }
  }

  Future<Map<String, dynamic>> _buildUnbindPayload(
    _IdentityCardData target,
  ) async {
    if (_unbindVerifyMethod.isEmpty) {
      throw Exception('请选择二次校验方式');
    }

    final payload = <String, dynamic>{
      'provider': target.provider,
      'providerUserId': target.providerUserId,
      'providerAppId': target.providerAppId,
      'verificationType': _unbindVerifyMethod,
    };

    switch (_unbindVerifyMethod) {
      case 'password':
        final currentPassword = _unbindPasswordController.text.trim();
        if (currentPassword.isEmpty) {
          throw Exception('请输入当前密码');
        }
        payload['currentPassword'] = currentPassword;
        return payload;
      case 'phone_code':
        final phone = _unbindPhoneController.text.trim();
        final code = _unbindCodeController.text.trim();
        if (phone.isEmpty || code.isEmpty) {
          throw Exception('请完整填写手机号和验证码');
        }
        payload['phone'] = phone;
        payload['code'] = code;
        return payload;
      default:
        payload.addAll(
          await ref
              .read(authServiceProvider)
              .resolveUnbindVerificationPayload(_unbindVerifyMethod),
        );
        return payload;
    }
  }

  Future<void> _submitUnbind() async {
    final target = _unbindTarget;
    if (target == null) {
      return;
    }

    await _runIdentityMutation(
      action: () async {
        final payload = await _buildUnbindPayload(target);
        await ref.read(authServiceProvider).unbindIdentity(payload);
      },
      successMessage: '${target.label}解绑成功',
      failureFallback: '${target.label}解绑失败',
      onSuccess: () => _closeUnbindModal(force: true),
    );
  }

  void _closeEmailModal({bool force = false}) {
    if (_isSubmittingIdentity && !force) {
      return;
    }

    setState(() {
      _emailModalOpen = false;
      _bindEmailController.clear();
      _bindEmailPasswordController.clear();
    });
  }

  void _closePhoneModal({bool force = false}) {
    if (_isSubmittingIdentity && !force) {
      return;
    }

    setState(() {
      _phoneModalOpen = false;
      _bindPhoneCodeController.clear();
    });
  }

  void _closeUnbindModal({bool force = false}) {
    if (_isSubmittingIdentity && !force) {
      return;
    }

    setState(_clearUnbindState);
  }

  void _clearUnbindState() {
    _unbindModalOpen = false;
    _unbindTarget = null;
    _unbindVerifyMethod = '';
    _unbindPasswordController.clear();
    _unbindPhoneController.clear();
    _unbindCodeController.clear();
  }

  void _startBindPhoneCountdown([int duration = 60]) {
    _bindPhoneTimer?.cancel();
    setState(() {
      _bindPhoneCountdown = duration;
    });
    _bindPhoneTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || _bindPhoneCountdown <= 1) {
        timer.cancel();
        if (mounted) {
          setState(() {
            _bindPhoneCountdown = 0;
          });
        }
        return;
      }

      setState(() {
        _bindPhoneCountdown -= 1;
      });
    });
  }

  void _startUnbindPhoneCountdown([int duration = 60]) {
    _unbindPhoneTimer?.cancel();
    setState(() {
      _unbindPhoneCountdown = duration;
    });
    _unbindPhoneTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || _unbindPhoneCountdown <= 1) {
        timer.cancel();
        if (mounted) {
          setState(() {
            _unbindPhoneCountdown = 0;
          });
        }
        return;
      }

      setState(() {
        _unbindPhoneCountdown -= 1;
      });
    });
  }
  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final uid = user?.uid ?? '';

    return ProfileSubviewScaffold(
      title: '账号管理',
      onBack: widget.onBack,
      child: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ProfileSurfaceCard(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      const Text(
                        '当前 UID',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.slate700,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          uid,
                          textAlign: TextAlign.right,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: 'Courier New',
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                const Text('账号绑定', style: AppTypography.sectionKicker),
                const SizedBox(height: 12),
                if (!_hasLoadedIdentities && _isLoadingIdentities)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  )
                else ...[
                  for (var index = 0; index < _identityCards.length; index++)
                    _buildIdentityCard(
                      _identityCards[index],
                      withTopMargin: index > 0,
                    ),
                  if (_isLoadingIdentities) ...[
                    const SizedBox(height: 12),
                    const Center(
                      child: SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  ],
                ],
                const SizedBox(height: 22),
                const Text('修改密码', style: AppTypography.sectionKicker),
                const SizedBox(height: 12),
                ProfileSurfaceCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildFieldLabel('旧密码'),
                      _buildFilledInput(
                        controller: _currentPasswordController,
                        hintText: '请输入旧密码',
                        obscureText: true,
                        textInputAction: TextInputAction.next,
                      ),
                      const SizedBox(height: 14),
                      _buildFieldLabel('新密码'),
                      _buildFilledInput(
                        controller: _newPasswordController,
                        hintText: '请输入新密码',
                        obscureText: true,
                        textInputAction: TextInputAction.next,
                      ),
                      const SizedBox(height: 14),
                      _buildFieldLabel('确认新密码'),
                      _buildFilledInput(
                        controller: _confirmPasswordController,
                        hintText: '请再次输入新密码',
                        obscureText: true,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _submitChangePassword(),
                      ),
                      if (_passwordError.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Center(
                          child: Text(
                            _passwordError,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.danger,
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        child: ProfileActionButton(
                          label: _isSubmittingPassword ? '提交中...' : '确认修改',
                          backgroundColor: AppColors.primary,
                          textColor: Colors.white,
                          onTap: _isSubmittingPassword
                              ? null
                              : _submitChangePassword,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (_emailModalOpen) _buildEmailModal(),
          if (_phoneModalOpen) _buildPhoneModal(),
          if (_unbindModalOpen && _unbindTarget != null) _buildUnbindModal(),
        ],
      ),
    );
  }

  Widget _buildIdentityCard(
    _IdentityCardData item, {
    required bool withTopMargin,
  }) {
    final backgroundColor = item.actionDisabled
        ? AppColors.slate200
        : item.bound
            ? const Color(0xFFFFF1F2)
            : AppColors.primaryLight;
    final textColor = item.actionDisabled
        ? AppColors.textSecondary
        : item.bound
            ? AppColors.danger
            : AppColors.primary;

    return ProfileSurfaceCard(
      margin: EdgeInsets.only(top: withTopMargin ? 12 : 0),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.slate50,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Center(
              child: AppIcon(
                name: item.icon,
                size: 18,
                color: item.color,
                filled: item.key == 'wechat' || item.key == 'wechatApp',
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.label,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  item.desc,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: item.actionDisabled ? null : () => _handleIdentityAction(item),
            child: Container(
              constraints: const BoxConstraints(minWidth: 72),
              height: 34,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: backgroundColor,
                borderRadius: BorderRadius.circular(12),
              ),
              alignment: Alignment.center,
              child: Text(
                item.actionDisabled ? '保留' : (item.bound ? '解绑' : '去绑定'),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: textColor,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
  Widget _buildEmailModal() {
    return ProfileModalMask(
      onDismiss: () => _closeEmailModal(),
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(maxWidth: 340),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Center(
              child: Text(
                '绑定邮箱',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 16),
            _buildFieldLabel('邮箱地址'),
            _buildFilledInput(
              controller: _bindEmailController,
              hintText: '请输入邮箱',
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 16),
            _buildFieldLabel('设置密码'),
            _buildFilledInput(
              controller: _bindEmailPasswordController,
              hintText: '请输入密码',
              obscureText: true,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _submitBindEmail(),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: ProfileActionButton(
                    label: '取消',
                    backgroundColor: AppColors.slate50,
                    textColor: AppColors.slate600,
                    onTap: _isSubmittingIdentity
                        ? null
                        : () => _closeEmailModal(),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ProfileActionButton(
                    label: _isSubmittingIdentity ? '提交中...' : '确认绑定',
                    backgroundColor: AppColors.primary,
                    textColor: Colors.white,
                    onTap: _isSubmittingIdentity ? null : _submitBindEmail,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhoneModal() {
    return ProfileModalMask(
      onDismiss: () => _closePhoneModal(),
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(maxWidth: 340),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Center(
              child: Text(
                '绑定手机号',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 16),
            _buildFieldLabel('手机号'),
            Row(
              children: [
                Expanded(
                  child: _buildFilledInput(
                    controller: _bindPhoneController,
                    hintText: '请输入手机号',
                    keyboardType: TextInputType.phone,
                    textInputAction: TextInputAction.next,
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: (_isSubmittingIdentity || _bindPhoneCountdown > 0)
                      ? null
                      : _sendBindPhoneVerificationCode,
                  child: Container(
                    constraints: const BoxConstraints(minWidth: 104),
                    height: 48,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: AppColors.slate100,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      _bindPhoneCountdownText,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: (_isSubmittingIdentity || _bindPhoneCountdown > 0)
                            ? AppColors.textSecondary
                            : AppColors.slate700,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildFieldLabel('验证码'),
            _buildFilledInput(
              controller: _bindPhoneCodeController,
              hintText: '请输入验证码',
              keyboardType: TextInputType.number,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _submitBindPhone(),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: ProfileActionButton(
                    label: '取消',
                    backgroundColor: AppColors.slate50,
                    textColor: AppColors.slate600,
                    onTap: _isSubmittingIdentity
                        ? null
                        : () => _closePhoneModal(),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ProfileActionButton(
                    label: _isSubmittingIdentity ? '提交中...' : '确认绑定',
                    backgroundColor: AppColors.primary,
                    textColor: Colors.white,
                    onTap: _isSubmittingIdentity ? null : _submitBindPhone,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUnbindModal() {
    final target = _unbindTarget!;
    final methods = _availableVerifyMethods;

    return ProfileModalMask(
      onDismiss: () => _closeUnbindModal(),
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(maxWidth: 340),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Center(
              child: Text(
                '解绑前二次校验',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '正在解绑“${target.label}”，请先完成安全校验。',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12,
                height: 1.5,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final method in methods)
                  GestureDetector(
                    onTap: _isSubmittingIdentity
                        ? null
                        : () => _selectVerifyMethod(method.key),
                    child: Container(
                      constraints: const BoxConstraints(minWidth: 86),
                      height: 34,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: _unbindVerifyMethod == method.key
                            ? AppColors.primaryLight
                            : AppColors.slate100,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        method.label,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: _unbindVerifyMethod == method.key
                              ? AppColors.primary
                              : AppColors.textMuted,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            if (_unbindVerifyMethod == 'password') ...[
              const SizedBox(height: 16),
              _buildFieldLabel('当前密码'),
              _buildFilledInput(
                controller: _unbindPasswordController,
                hintText: '请输入当前密码',
                obscureText: true,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _submitUnbind(),
              ),
            ] else if (_unbindVerifyMethod == 'phone_code') ...[
              const SizedBox(height: 16),
              _buildFieldLabel('手机号'),
              Row(
                children: [
                  Expanded(
                    child: _buildFilledInput(
                      controller: _unbindPhoneController,
                      hintText: '请输入已绑定手机号',
                      keyboardType: TextInputType.phone,
                      textInputAction: TextInputAction.next,
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: (_isSubmittingIdentity || _unbindPhoneCountdown > 0)
                        ? null
                        : _sendUnbindPhoneVerificationCode,
                    child: Container(
                      constraints: const BoxConstraints(minWidth: 104),
                      height: 48,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: AppColors.slate100,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        _unbindPhoneCountdownText,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color:
                              (_isSubmittingIdentity || _unbindPhoneCountdown > 0)
                                  ? AppColors.textSecondary
                                  : AppColors.slate700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _buildFieldLabel('验证码'),
              _buildFilledInput(
                controller: _unbindCodeController,
                hintText: '请输入验证码',
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _submitUnbind(),
              ),
            ] else ...[
              const SizedBox(height: 16),
              const Text(
                '选择“确认解绑”后将触发对应第三方账号的重新授权校验。',
                style: TextStyle(
                  fontSize: 12,
                  height: 1.5,
                  color: AppColors.textMuted,
                ),
              ),
            ],
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: ProfileActionButton(
                    label: '取消',
                    backgroundColor: AppColors.slate50,
                    textColor: AppColors.slate600,
                    onTap: _isSubmittingIdentity
                        ? null
                        : () => _closeUnbindModal(),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ProfileActionButton(
                    label: _isSubmittingIdentity ? '提交中...' : '确认解绑',
                    backgroundColor: AppColors.danger,
                    textColor: Colors.white,
                    onTap: _isSubmittingIdentity ? null : _submitUnbind,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFieldLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 6),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: AppColors.slate700,
        ),
      ),
    );
  }

  Widget _buildFilledInput({
    required TextEditingController controller,
    required String hintText,
    TextInputType? keyboardType,
    TextInputAction? textInputAction,
    bool obscureText = false,
    ValueChanged<String>? onSubmitted,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.slate50,
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        textInputAction: textInputAction,
        obscureText: obscureText,
        onSubmitted: onSubmitted,
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: const TextStyle(color: AppColors.textSecondary),
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          filled: false,
        ),
      ),
    );
  }
}
class _IdentityCardData {
  const _IdentityCardData({
    required this.key,
    required this.provider,
    required this.providerUserId,
    required this.providerAppId,
    required this.icon,
    required this.color,
    required this.label,
    required this.bound,
    required this.actionDisabled,
    required this.desc,
  });

  final String key;
  final String provider;
  final String providerUserId;
  final String providerAppId;
  final String icon;
  final Color color;
  final String label;
  final bool bound;
  final bool actionDisabled;
  final String desc;
}

class _VerifyMethodOption {
  const _VerifyMethodOption({
    required this.key,
    required this.label,
  });

  final String key;
  final String label;
}

List<_IdentityCardData> _buildIdentityCards(List<AuthIdentity> identities) {
  final emailIdentity = _findIdentity(identities, 'email_password');
  final phoneIdentity = _findIdentity(identities, 'phone_sms');
  final miniIdentity = _findIdentity(identities, 'wechat_mini_program');
  final wechatAppIdentity = _findIdentity(identities, 'wechat_app');
  final googleAppIdentity = _findIdentity(identities, 'google_app');
  final boundIdentityCount = identities.length;

  return [
    _IdentityCardData(
      key: 'email',
      provider: emailIdentity?.provider ?? 'email_password',
      providerUserId: emailIdentity?.providerUserId ?? '',
      providerAppId: emailIdentity?.providerAppId ?? '',
      icon: 'mail',
      color: AppColors.info,
      label: '邮箱账号',
      bound: emailIdentity != null,
      actionDisabled: emailIdentity != null && boundIdentityCount <= 1,
      desc: emailIdentity?.providerUserId ?? '未绑定邮箱',
    ),
    _IdentityCardData(
      key: 'phone',
      provider: phoneIdentity?.provider ?? 'phone_sms',
      providerUserId: phoneIdentity?.providerUserId ?? '',
      providerAppId: phoneIdentity?.providerAppId ?? '',
      icon: 'phone',
      color: AppColors.success,
      label: '手机号',
      bound: phoneIdentity != null,
      actionDisabled: phoneIdentity != null && boundIdentityCount <= 1,
      desc: phoneIdentity?.providerUserId ?? '未绑定手机号',
    ),
    _IdentityCardData(
      key: 'wechatApp',
      provider: wechatAppIdentity?.provider ?? 'wechat_app',
      providerUserId: wechatAppIdentity?.providerUserId ?? '',
      providerAppId: wechatAppIdentity?.providerAppId ?? '',
      icon: 'message',
      color: _AccountManagementViewState._wechatGreen,
      label: '微信 App',
      bound: wechatAppIdentity != null,
      actionDisabled: wechatAppIdentity != null && boundIdentityCount <= 1,
      desc: wechatAppIdentity != null ? '已绑定微信 App 身份' : '未绑定微信 App 身份',
    ),
    _IdentityCardData(
      key: 'googleApp',
      provider: googleAppIdentity?.provider ?? 'google_app',
      providerUserId: googleAppIdentity?.providerUserId ?? '',
      providerAppId: googleAppIdentity?.providerAppId ?? '',
      icon: 'globe',
      color: AppColors.info,
      label: 'Google',
      bound: googleAppIdentity != null,
      actionDisabled: googleAppIdentity != null && boundIdentityCount <= 1,
      desc: googleAppIdentity != null ? '已绑定 Google 身份' : '未绑定 Google 身份',
    ),
    _IdentityCardData(
      key: 'wechat',
      provider: miniIdentity?.provider ?? 'wechat_mini_program',
      providerUserId: miniIdentity?.providerUserId ?? '',
      providerAppId: miniIdentity?.providerAppId ?? '',
      icon: 'message',
      color: _AccountManagementViewState._wechatGreen,
      label: '微信小程序',
      bound: miniIdentity != null,
      actionDisabled: miniIdentity != null && boundIdentityCount <= 1,
      desc: miniIdentity != null ? '已绑定微信小程序身份' : '未绑定微信小程序身份',
    ),
  ];
}

_IdentityCardData? _findMatchingCard(
  List<AuthIdentity> identities,
  _IdentityCardData target,
) {
  for (final item in _buildIdentityCards(identities)) {
    if (item.provider == target.provider &&
        item.providerUserId == target.providerUserId &&
        item.providerAppId == target.providerAppId) {
      return item;
    }
  }

  return null;
}

List<_VerifyMethodOption> _buildVerifyMethods(
  List<AuthIdentity> identities,
  _IdentityCardData? unbindTarget,
) {
  if (unbindTarget == null) {
    return const <_VerifyMethodOption>[];
  }

  final remaining = identities.where((item) {
    return !(item.provider == unbindTarget.provider &&
        item.providerUserId == unbindTarget.providerUserId &&
        item.providerAppId == unbindTarget.providerAppId);
  }).toList(growable: false);

  final methods = <_VerifyMethodOption>[];
  if (remaining.any((item) => item.provider == 'email_password')) {
    methods.add(const _VerifyMethodOption(key: 'password', label: '密码校验'));
  }
  if (remaining.any((item) => item.provider == 'phone_sms')) {
    methods.add(const _VerifyMethodOption(key: 'phone_code', label: '短信验证码'));
  }
  if (remaining.any((item) => item.provider == 'wechat_mini_program')) {
    methods.add(
      const _VerifyMethodOption(
        key: 'wechat_mini_program',
        label: '微信小程序校验',
      ),
    );
  }
  if (remaining.any((item) => item.provider == 'wechat_app')) {
    methods.add(const _VerifyMethodOption(key: 'wechat_app', label: '微信 App 校验'));
  }
  if (remaining.any((item) => item.provider == 'google_app')) {
    methods.add(const _VerifyMethodOption(key: 'google_app', label: 'Google 校验'));
  }

  return methods;
}

AuthIdentity? _findIdentity(List<AuthIdentity> identities, String provider) {
  for (final item in identities) {
    if (item.provider == provider) {
      return item;
    }
  }

  return null;
}

String _formatCountdownText(int countdown) {
  if (countdown > 0) {
    return '${countdown}s 后重发';
  }

  return '发送验证码';
}
