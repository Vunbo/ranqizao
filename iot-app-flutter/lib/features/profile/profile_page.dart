import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/user_identity.dart';
import '../../core/theme.dart';
import '../../models/merchant.dart';
import '../../providers/auth_provider.dart';
import '../../providers/device_provider.dart';
import '../../providers/home_provider.dart';
import '../../services/api_client.dart';
import '../../services/merchant_service.dart';
import '../../widgets/app_icon.dart';
import 'widgets/account_management_view.dart';
import 'widgets/device_management_view.dart';
import 'widgets/home_management_view.dart';
import 'widgets/merchant_landing_view.dart';
import 'widgets/merchant_panel_view.dart';
import 'widgets/notification_settings_view.dart';
import 'widgets/profile_subview_scaffold.dart';
import 'widgets/sharing_management_view.dart';

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  final TextEditingController _editDisplayNameController =
      TextEditingController();

  bool _isEditNameModalOpen = false;
  bool _isUpdatingDisplayName = false;
  bool _isLoadingMerchantSummary = false;
  String _activeSubView = 'main';
  MerchantSummary? _merchantSummary;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }

      final deviceState = ref.read(deviceProvider);
      if (!deviceState.hasLoaded && !deviceState.isLoading) {
        ref.read(deviceProvider.notifier).loadDevices();
      }

      final homeState = ref.read(homeProvider);
      if (!homeState.hasLoaded && !homeState.isLoading) {
        ref.read(homeProvider.notifier).loadHomes();
      }

      if (_merchantSummary == null && !_isLoadingMerchantSummary) {
        _loadMerchantSummary(silent: true);
      }
    });
  }

  @override
  void dispose() {
    _editDisplayNameController.dispose();
    super.dispose();
  }

  Future<void> _loadMerchantSummary({bool silent = false}) async {
    if (_isLoadingMerchantSummary) {
      return;
    }

    setState(() {
      _isLoadingMerchantSummary = true;
    });

    try {
      final summary = await ref.read(merchantServiceProvider).getSummary();
      if (!mounted) {
        return;
      }
      setState(() {
        _merchantSummary = summary;
      });
    } catch (error) {
      if (!silent) {
        _showSnackBar(
          extractErrorMessage(error, fallback: '商户状态加载失败'),
          isError: true,
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingMerchantSummary = false;
        });
      }
    }
  }

  void _openEditName(String displayName) {
    _editDisplayNameController.text = displayName;
    setState(() {
      _isEditNameModalOpen = true;
    });
  }

  void _closeEditName() {
    if (_isUpdatingDisplayName || !mounted) {
      return;
    }

    setState(() {
      _isEditNameModalOpen = false;
    });
  }

  void _openSubView(String id) {
    if (id == 'merchant' || id == 'merchant-panel') {
      _loadMerchantSummary(silent: true);
    }

    setState(() {
      _activeSubView = id;
    });
  }

  void _closeSubView() {
    setState(() {
      _activeSubView = 'main';
    });
    _loadMerchantSummary(silent: true);
  }

  Future<void> _handleUpdateDisplayName(String currentDisplayName) async {
    final nextName = _editDisplayNameController.text.trim();
    if (nextName.isEmpty) {
      _showSnackBar('名称不能为空', isError: true);
      return;
    }

    if (nextName == currentDisplayName) {
      _closeEditName();
      return;
    }

    setState(() {
      _isUpdatingDisplayName = true;
    });

    try {
      final success =
          await ref.read(authProvider.notifier).updateDisplayName(nextName);
      if (!mounted) {
        return;
      }

      if (!success) {
        final message = ref.read(authProvider).error;
        _showSnackBar(
          message?.trim().isNotEmpty == true ? message! : '名称修改失败',
          isError: true,
        );
        return;
      }

      setState(() {
        _isEditNameModalOpen = false;
      });
      _showSnackBar('名称修改成功', isError: false);
    } finally {
      if (mounted) {
        setState(() {
          _isUpdatingDisplayName = false;
        });
      }
    }
  }

  Future<void> _copyUid(String shortUid) async {
    if (shortUid.isEmpty) {
      return;
    }

    try {
      await Clipboard.setData(ClipboardData(text: shortUid));
      _showSnackBar('UID 已复制到剪贴板', isError: false);
    } catch (_) {
      _showSnackBar('复制失败，请稍后重试', isError: true);
    }
  }

  void _showSnackBar(String message, {required bool isError}) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        backgroundColor: isError ? AppColors.danger : AppColors.success,
      ),
    );
  }

  Widget _buildSubView() {
    switch (_activeSubView) {
      case 'merchant':
        return MerchantLandingView(
          onBack: _closeSubView,
          onMessage: _showSnackBar,
        );
      case 'merchant-panel':
        return MerchantPanelView(
          onBack: _closeSubView,
          onMessage: _showSnackBar,
        );
      case 'account':
        return AccountManagementView(
          onBack: _closeSubView,
          onMessage: _showSnackBar,
        );
      case 'devices':
        return DeviceManagementView(
          onBack: _closeSubView,
          onMessage: _showSnackBar,
        );
      case 'homes':
        return HomeManagementView(
          onBack: _closeSubView,
          onMessage: _showSnackBar,
        );
      case 'sharing':
        return SharingManagementView(
          onBack: _closeSubView,
          onMessage: _showSnackBar,
        );
      case 'notifications':
        return NotificationSettingsView(onBack: _closeSubView);
      default:
        return _PlaceholderSubview(
            title: _activeSubView, onBack: _closeSubView);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_activeSubView != 'main') {
      return Scaffold(
        backgroundColor: AppColors.pageBg,
        body: _buildSubView(),
      );
    }

    final authState = ref.watch(authProvider);
    final deviceState = ref.watch(deviceProvider);
    final homeState = ref.watch(homeProvider);
    final user = authState.user;
    final shortUid = resolveUserShortUid(user);
    final displayName = (user?.displayName.trim().isNotEmpty == true
            ? user!.displayName.trim()
            : shortUid.isNotEmpty
                ? shortUid
                : '用户')
        .trim();
    final sharedUsersCount = deviceState.devices
        .where((device) => (device.ownerId ?? '') == shortUid)
        .fold<int>(0, (count, device) => count + device.sharedWith.length);

    final settingsItems = [
      const _ProfileItem('account', 'shield', '账号管理', '绑定与安全'),
      _ProfileItem(
        'devices',
        'flame',
        '设备管理',
        '${deviceState.devices.length} 台设备',
      ),
      _ProfileItem('homes', 'home', '家庭管理', '${homeState.homes.length} 个家庭'),
      _ProfileItem('sharing', 'shield', '共享管理', '$sharedUsersCount 位成员'),
      const _ProfileItem('notifications', 'message', '消息通知', '已开启'),
    ];
    const supportItems = [
      _ProfileItem('help', 'info', '帮助中心', ''),
      _ProfileItem('feedback', 'message', '意见反馈', ''),
      _ProfileItem('about', 'info', '关于我们', 'v2.1.0'),
    ];
    final moreItems = [
      const _ProfileItem(
        'merchant',
        'globe',
        '推广 / 入驻',
        '合作与商户',
        iconColor: AppColors.info,
      ),
      if (_merchantSummary?.canEnterPanel == true)
        const _ProfileItem(
          'merchant-panel',
          'home',
          '进入商户面板',
          '管理商户信息',
          iconColor: Color(0xFF2563EB),
        ),
    ];

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _HeroCard(
                  displayName: displayName,
                  shortUid: shortUid,
                  avatarUrl: user?.avatar,
                  onEditName: () => _openEditName(displayName),
                  onCopyUid: () => _copyUid(shortUid),
                ),
                const SizedBox(height: 22),
                const Text('通用设置', style: AppTypography.sectionKicker),
                const SizedBox(height: 12),
                ...settingsItems.map(
                  (item) => _ItemCard(
                    item: item,
                    onTap: () => _openSubView(item.id),
                  ),
                ),
                const SizedBox(height: 22),
                const Text('支持与反馈', style: AppTypography.sectionKicker),
                const SizedBox(height: 12),
                ...supportItems.map((item) => _ItemCard(item: item)),
                const SizedBox(height: 22),
                const Text('更多', style: AppTypography.sectionKicker),
                const SizedBox(height: 12),
                ...moreItems.map(
                  (item) => _ItemCard(
                    item: item,
                    onTap: () => _openSubView(item.id),
                  ),
                ),
                if (_isLoadingMerchantSummary) ...[
                  const SizedBox(height: 12),
                  const Center(
                    child: SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                GestureDetector(
                  onTap: () => ref.read(authProvider.notifier).logout(),
                  child: Container(
                    height: 56,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF1F2),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Center(
                      child: Text(
                        '退出登录',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.danger,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (_isEditNameModalOpen)
            ProfileModalMask(
              onDismiss: _closeEditName,
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
                        '修改名称',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      '名称不能为空，修改后将同步展示到成员列表。',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.5,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 18),
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.slate50,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: TextField(
                        controller: _editDisplayNameController,
                        enabled: !_isUpdatingDisplayName,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) =>
                            _handleUpdateDisplayName(displayName),
                        decoration: const InputDecoration(
                          hintText: '请输入名称',
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          filled: false,
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        Expanded(
                          child: ProfileActionButton(
                            label: '取消',
                            backgroundColor: AppColors.slate50,
                            textColor: AppColors.slate600,
                            onTap:
                                _isUpdatingDisplayName ? null : _closeEditName,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ProfileActionButton(
                            label: _isUpdatingDisplayName ? '保存中...' : '确认修改',
                            backgroundColor: AppColors.primary,
                            textColor: Colors.white,
                            onTap: _isUpdatingDisplayName
                                ? null
                                : () => _handleUpdateDisplayName(displayName),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.displayName,
    required this.shortUid,
    required this.avatarUrl,
    required this.onEditName,
    required this.onCopyUid,
  });

  final String displayName;
  final String shortUid;
  final String? avatarUrl;
  final VoidCallback onEditName;
  final VoidCallback onCopyUid;

  @override
  Widget build(BuildContext context) {
    final normalizedAvatarUrl = avatarUrl?.trim() ?? '';
    final hasAvatar = normalizedAvatarUrl.isNotEmpty;

    return Center(
      child: Column(
        children: [
          Stack(
            children: [
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  gradient: hasAvatar
                      ? null
                      : const LinearGradient(
                          colors: [Color(0xFFF97316), Color(0xFFEA580C)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 4),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 18,
                      offset: const Offset(0, 6),
                    ),
                  ],
                  image: hasAvatar
                      ? DecorationImage(
                          image: NetworkImage(normalizedAvatarUrl),
                          fit: BoxFit.cover,
                        )
                      : null,
                ),
                child: hasAvatar
                    ? null
                    : const Center(
                        child: AppIcon(
                          name: 'user',
                          size: 32,
                          color: Colors.white,
                        ),
                      ),
              ),
              Positioned(
                right: 4,
                bottom: 4,
                child: Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: AppColors.success,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          GestureDetector(
            onTap: onEditName,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  displayName,
                  style: const TextStyle(
                    fontFamily: AppTypography.displayFont,
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(width: 6),
                const SizedBox(
                  width: 28,
                  height: 28,
                  child: Center(
                    child: AppIcon(
                      name: 'edit',
                      size: 14,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: onCopyUid,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'UID: $shortUid',
                  style: const TextStyle(
                    fontFamily: 'Courier New',
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(width: 6),
                const SizedBox(
                  width: 24,
                  height: 24,
                  child: Center(
                    child: AppIcon(
                      name: 'copy',
                      size: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ItemCard extends StatelessWidget {
  const _ItemCard({
    required this.item,
    this.onTap,
  });

  final _ProfileItem item;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.cardBorder),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.pageBg,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Center(
              child: AppIcon(
                name: item.icon,
                size: 16,
                color: item.iconColor,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              item.label,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.slate700,
              ),
            ),
          ),
          if (item.extra.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Text(
                item.extra,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
          const AppIcon(name: 'chevron', size: 14, color: AppColors.slate300),
        ],
      ),
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: onTap == null
          ? content
          : GestureDetector(
              onTap: onTap,
              child: content,
            ),
    );
  }
}

class _ProfileItem {
  const _ProfileItem(
    this.id,
    this.icon,
    this.label,
    this.extra, {
    this.iconColor = AppColors.slate600,
  });

  final String id;
  final String icon;
  final String label;
  final String extra;
  final Color iconColor;
}

class _PlaceholderSubview extends StatelessWidget {
  const _PlaceholderSubview({
    required this.title,
    required this.onBack,
  });

  final String title;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return ProfileSubviewScaffold(
      title: title,
      onBack: onBack,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Text(
            '$title 页面将在后续阶段按 uni-app 1:1 迁移。',
            style: const TextStyle(color: AppColors.textMuted),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
