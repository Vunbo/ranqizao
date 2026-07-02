import 'dart:math' as math;
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../core/user_identity.dart';
import '../../models/device.dart';
import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../../providers/device_provider.dart';
import '../../services/api_client.dart';
import '../../widgets/app_icon.dart';
import 'device_detail_support.dart';

class DeviceDetailPage extends ConsumerStatefulWidget {
  const DeviceDetailPage({super.key, required this.deviceId});

  final String deviceId;

  @override
  ConsumerState<DeviceDetailPage> createState() => _DeviceDetailPageState();
}

class _DeviceDetailPageState extends ConsumerState<DeviceDetailPage>
    with SingleTickerProviderStateMixin {
  final TextEditingController _renameController = TextEditingController();
  final TextEditingController _shareUidController = TextEditingController();

  late final AnimationController _pulseController;

  bool _isPending = false;
  bool _isRenameModalOpen = false;
  bool _isShareModalOpen = false;
  bool _isShareLoading = false;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2100),
    )..repeat();
    Future.microtask(_loadDetail);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _renameController.dispose();
    _shareUidController.dispose();
    super.dispose();
  }

  Future<void> _loadDetail() {
    return ref.read(deviceProvider.notifier).loadDetail(widget.deviceId);
  }

  void _handleBack() {
    if (context.canPop()) {
      context.pop();
      return;
    }
    context.go('/');
  }

  void _openRename(Device device) {
    _renameController.text = device.name;
    setState(() {
      _isRenameModalOpen = true;
    });
  }

  void _closeRename() {
    if (!mounted) {
      return;
    }
    setState(() {
      _isRenameModalOpen = false;
    });
  }

  void _openShare() {
    setState(() {
      _isShareModalOpen = true;
    });
  }

  void _closeShare() {
    if (!mounted) {
      return;
    }
    setState(() {
      _isShareModalOpen = false;
      _isShareLoading = false;
    });
  }

  Future<void> _handleToggle(Device device) async {
    if (_isPending) {
      return;
    }

    if (!device.isOn) {
      final confirmed = await _showConfirmDialog(
        title: '安全确认',
        message: '开启火源前，请确认厨房通风良好、灶台附近没有易燃物，并且现场有人看护。',
        confirmText: '确认开启',
        confirmColor: AppColors.primary,
      );
      if (!confirmed) {
        return;
      }
    }

    setState(() {
      _isPending = true;
    });

    try {
      await ref.read(deviceProvider.notifier).updateDevice(
        device.id,
        {'isOn': !device.isOn},
      );
      await _writeDeviceLog(
        device.id,
        event: device.isOn ? '远程关闭火源' : '远程开启火源',
        type: device.isOn ? 'info' : 'success',
      );
      _showSnackBar(
        device.isOn ? '设备已关闭' : '设备已开启',
        tone: _ToastTone.success,
      );
    } catch (error) {
      _showSnackBar(
        extractErrorMessage(error, fallback: '操作失败，请重试'),
        tone: _ToastTone.error,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isPending = false;
        });
      }
    }
  }

  Future<void> _handleFireLevel(Device device, int level) async {
    if (_isPending || !device.isOn) {
      return;
    }

    setState(() {
      _isPending = true;
    });

    try {
      await ref.read(deviceProvider.notifier).updateDevice(
        device.id,
        {'fireLevel': level},
      );
      await _writeDeviceLog(
        device.id,
        event: '调整火力至 $level%',
        type: 'success',
      );
      _showSnackBar('火力已调整至 $level%', tone: _ToastTone.success);
    } catch (error) {
      _showSnackBar(
        extractErrorMessage(error, fallback: '调节失败，请重试'),
        tone: _ToastTone.error,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isPending = false;
        });
      }
    }
  }

  Future<void> _handleRename(Device device, List<Device> devices) async {
    if (_isPending) {
      return;
    }

    final nextName = _normalizeText(_renameController.text);
    if (nextName.isEmpty) {
      return;
    }

    final hasDuplicate = devices.any((item) {
      return item.id != device.id &&
          item.name.trim().toLowerCase() == nextName.toLowerCase();
    });
    if (hasDuplicate) {
      _showSnackBar('设备名称已存在，请更换一个名称。', tone: _ToastTone.error);
      return;
    }

    setState(() {
      _isPending = true;
    });

    try {
      await ref.read(deviceProvider.notifier).updateDevice(
        device.id,
        {'name': nextName},
      );
      await _writeDeviceLog(
        device.id,
        event: '重命名设备为“$nextName”',
        type: 'info',
      );
      _closeRename();
      _showSnackBar('设备重命名成功', tone: _ToastTone.success);
    } catch (error) {
      _showSnackBar(
        extractErrorMessage(error, fallback: '重命名失败，请重试'),
        tone: _ToastTone.error,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isPending = false;
        });
      }
    }
  }

  Future<void> _handleDelete(Device device) async {
    if (_isPending) {
      return;
    }

    final confirmed = await _showConfirmDialog(
      title: '删除设备',
      message: '确定要删除设备“${device.name}”吗？此操作不可撤销。',
      confirmText: '确认删除',
      confirmColor: AppColors.danger,
    );
    if (!confirmed) {
      return;
    }

    setState(() {
      _isPending = true;
    });

    try {
      await ref.read(deviceProvider.notifier).deleteDevice(device.id);
      if (!mounted) {
        return;
      }
      _showSnackBar('设备已删除', tone: _ToastTone.success);
      _handleBack();
    } catch (error) {
      _showSnackBar(
        extractErrorMessage(error, fallback: '删除失败，请重试'),
        tone: _ToastTone.error,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isPending = false;
        });
      }
    }
  }

  Future<void> _handleShare(Device device) async {
    if (_isShareLoading) {
      return;
    }

    final uid = _normalizeText(_shareUidController.text);
    if (uid.isEmpty) {
      return;
    }

    final sharedUsers = _buildSharedUsers(device);
    if (sharedUsers.any((user) => user.uid == uid)) {
      _showSnackBar('该用户已在共享列表中。', tone: _ToastTone.info);
      return;
    }

    setState(() {
      _isShareLoading = true;
    });
    try {
      await ref.read(deviceProvider.notifier).shareDevice(device.id, uid);
      _shareUidController.clear();
      _closeShare();
      _showSnackBar('设备共享成功', tone: _ToastTone.success);
    } catch (error) {
      _showSnackBar(
        extractErrorMessage(error, fallback: '共享失败，请检查 UID'),
        tone: _ToastTone.error,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isShareLoading = false;
        });
      }
    }
  }

  Future<void> _handleRemoveShare(Device device, String uid) async {
    if (_isShareLoading) {
      return;
    }

    setState(() {
      _isShareLoading = true;
    });

    try {
      await ref.read(deviceProvider.notifier).unshareDevice(device.id, uid);
      _showSnackBar('已取消共享', tone: _ToastTone.success);
    } catch (error) {
      _showSnackBar(
        extractErrorMessage(error, fallback: '操作失败，请重试'),
        tone: _ToastTone.error,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isShareLoading = false;
        });
      }
    }
  }

  Future<void> _writeDeviceLog(
    String deviceId, {
    required String event,
    String type = 'info',
  }) async {
    try {
      await ref.read(deviceProvider.notifier).createLog(
            deviceId,
            event: event,
            type: type,
          );
    } catch (_) {
      // 日志写入失败不阻断主流程。
    }
  }

  Future<bool> _showConfirmDialog({
    required String title,
    required String message,
    required String confirmText,
    required Color confirmColor,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
          title: Text(
            title,
            style: AppTypography.h3,
          ),
          content: Text(
            message,
            style: const TextStyle(
              height: 1.6,
              color: AppColors.slate600,
            ),
          ),
          actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          actions: [
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(dialogContext).pop(false),
                    child: const Text('取消'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(dialogContext).pop(true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: confirmColor,
                    ),
                    child: Text(confirmText),
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );

    return result ?? false;
  }

  void _showSnackBar(String message, {required _ToastTone tone}) {
    if (!mounted) {
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();

    final backgroundColor = switch (tone) {
      _ToastTone.success => AppColors.success,
      _ToastTone.error => AppColors.danger,
      _ToastTone.info => AppColors.slate800,
    };

    messenger.showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        backgroundColor: backgroundColor,
      ),
    );
  }

  bool _isOwner(Device device, User? user) {
    return isDeviceOwnedByUser(device, user);
  }

  String _normalizeText(String value) {
    return value.trim();
  }

  List<_SharedUserItem> _buildSharedUsers(Device device) {
    if (device.sharedWithProfiles.isNotEmpty) {
      return device.sharedWithProfiles
          .map(
            (profile) => _SharedUserItem(
              uid: profile.uid,
              displayName: profile.displayName.trim().isNotEmpty
                  ? profile.displayName.trim()
                  : profile.uid,
            ),
          )
          .toList(growable: false);
    }

    return device.sharedWith
        .map(
          (uid) => _SharedUserItem(
            uid: uid,
            displayName: uid,
          ),
        )
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final deviceState = ref.watch(deviceProvider);
    final device = deviceState.selectedDevice;

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: Stack(
        children: [
          Positioned.fill(
            child: device == null
                ? _DeviceDetailEmptyState(
                    isLoading: deviceState.isLoading,
                    error: deviceState.error,
                    onRetry: _loadDetail,
                  )
                : RefreshIndicator(
                    onRefresh: _loadDetail,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _DeviceDetailHeader(
                            device: device,
                            isOwner: _isOwner(device, authState.user),
                            onBack: _handleBack,
                            onRename: () => _openRename(device),
                            onShare: _openShare,
                            onDelete: () => _handleDelete(device),
                          ),
                          if (deviceState.isLoading) ...[
                            const SizedBox(height: 10),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(999),
                              child:
                                  const LinearProgressIndicator(minHeight: 3),
                            ),
                          ],
                          const SizedBox(height: 18),
                          _DeviceControlCard(
                            isOn: device.isOn,
                            fireLevel: device.fireLevel,
                            isPending: _isPending,
                            pulseAnimation: _pulseController,
                            onToggle: () => _handleToggle(device),
                            onFireLevel: (level) =>
                                _handleFireLevel(device, level),
                          ),
                          const SizedBox(height: 18),
                          Row(
                            children: [
                              Expanded(
                                child: _DeviceStatCard(
                                  iconName: 'thermometer',
                                  iconColor: AppColors.primary,
                                  iconBackground: const Color(0xFFFFF7ED),
                                  label: '锅底温度',
                                  value: '${device.temp.toStringAsFixed(1)}°C',
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _DeviceStatCard(
                                  iconName: 'droplet',
                                  iconColor: AppColors.info,
                                  iconBackground: const Color(0xFFEFF6FF),
                                  label: '燃气浓度',
                                  value:
                                      '${device.gas.toStringAsFixed(2)}% LEL',
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 22),
                          Text(
                            '智能烹饪模式',
                            style: AppTypography.body.copyWith(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 12),
                          LayoutBuilder(
                            builder: (context, constraints) {
                              final itemWidth = (constraints.maxWidth - 12) / 2;
                              return Wrap(
                                spacing: 12,
                                runSpacing: 12,
                                children: cookingModes.map((mode) {
                                  final active = device.isOn &&
                                      device.fireLevel == mode.level;
                                  return SizedBox(
                                    width: itemWidth,
                                    child: _CookingModeCard(
                                      mode: mode,
                                      active: active,
                                      enabled: device.isOn && !_isPending,
                                      pulseAnimation: _pulseController,
                                      onTap: () =>
                                          _handleFireLevel(device, mode.level),
                                    ),
                                  );
                                }).toList(growable: false),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
          ),
          if (_isRenameModalOpen && device != null)
            _buildRenameModal(device, deviceState.devices),
          if (_isShareModalOpen && device != null) _buildShareModal(device),
        ],
      ),
    );
  }

  Widget _buildRenameModal(Device device, List<Device> devices) {
    return _ModalMask(
      onDismiss: _isPending ? null : _closeRename,
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
            const Text('重命名设备', style: AppTypography.h3),
            const SizedBox(height: 8),
            const Text(
              '请输入设备的新名称',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 18),
            Container(
              decoration: BoxDecoration(
                color: AppColors.slate50,
                borderRadius: BorderRadius.circular(16),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: TextField(
                controller: _renameController,
                enabled: !_isPending,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _handleRename(device, devices),
                decoration: const InputDecoration(
                  hintText: '例如：厨房主灶',
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
                  child: _ModalActionButton(
                    label: '取消',
                    backgroundColor: AppColors.slate50,
                    textColor: AppColors.slate600,
                    onTap: _isPending ? null : _closeRename,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _ModalActionButton(
                    label: _isPending ? '修改中...' : '确认修改',
                    backgroundColor: AppColors.primary,
                    textColor: Colors.white,
                    onTap: _isPending
                        ? null
                        : () => _handleRename(device, devices),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShareModal(Device device) {
    final sharedUsers = _buildSharedUsers(device);

    return _ModalMask(
      onDismiss: _isShareLoading ? null : _closeShare,
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(maxWidth: 360),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('设备共享', style: AppTypography.h3),
                const Spacer(),
                InkWell(
                  onTap: _isShareLoading ? null : _closeShare,
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: AppColors.slate50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(
                      child: AppIcon(
                        name: 'close',
                        size: 14,
                        color: AppColors.slate400,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            const Padding(
              padding: EdgeInsets.only(left: 4),
              child: Text(
                '用户 UID',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.slate50,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: TextField(
                      controller: _shareUidController,
                      enabled: !_isShareLoading,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _handleShare(device),
                      decoration: const InputDecoration(
                        hintText: '输入对方的 UID',
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        filled: false,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                _CompactPrimaryButton(
                  label: _isShareLoading ? '...' : '添加',
                  onTap: _isShareLoading ? null : () => _handleShare(device),
                ),
              ],
            ),
            const SizedBox(height: 18),
            const Text('已共享用户', style: AppTypography.sectionKicker),
            const SizedBox(height: 12),
            if (sharedUsers.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Text(
                    '暂无共享用户',
                    style:
                        TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ),
              )
            else
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 220),
                child: SingleChildScrollView(
                  child: Column(
                    children: sharedUsers.map((sharedUser) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        constraints: const BoxConstraints(minHeight: 44),
                        decoration: BoxDecoration(
                          color: AppColors.slate50,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                sharedUser.displayName,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.slate600,
                                  fontFamily: 'Courier New',
                                ),
                              ),
                            ),
                            InkWell(
                              onTap: _isShareLoading
                                  ? null
                                  : () => _handleRemoveShare(
                                      device, sharedUser.uid),
                              borderRadius: BorderRadius.circular(12),
                              child: const SizedBox(
                                width: 24,
                                height: 24,
                                child: Center(
                                  child: AppIcon(
                                    name: 'trash',
                                    size: 12,
                                    color: AppColors.danger,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(growable: false),
                  ),
                ),
              ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppIcon(
                    name: 'info',
                    size: 12,
                    color: AppColors.info,
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '共享后，对方可以查看设备状态并进行基础控制，请仅向可信成员授权。',
                      style: TextStyle(
                        fontSize: 10,
                        height: 1.6,
                        color: Color(0xFF1D4ED8),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum _ToastTone { success, error, info }

class _DeviceDetailHeader extends StatelessWidget {
  const _DeviceDetailHeader({
    required this.device,
    required this.isOwner,
    required this.onBack,
    required this.onRename,
    required this.onShare,
    required this.onDelete,
  });

  final Device device;
  final bool isOwner;
  final VoidCallback onBack;
  final VoidCallback onRename;
  final VoidCallback onShare;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Row(
            children: [
              _SquareAction(
                onTap: onBack,
                child: const AppIcon(
                  name: 'arrowLeft',
                  size: 18,
                  color: AppColors.slate600,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      device.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        fontFamily: AppTypography.displayFont,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'ID: ${_shortDeviceId(device.id)}',
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (isOwner) ...[
          _SquareAction(
            onTap: onRename,
            child: const AppIcon(
              name: 'edit',
              size: 16,
              color: AppColors.slate500,
            ),
          ),
          const SizedBox(width: 8),
          _SquareAction(
            onTap: onShare,
            backgroundColor: const Color(0xFFEFF6FF),
            borderColor: const Color(0xFFDBEAFE),
            child: const AppIcon(
              name: 'globe',
              size: 16,
              color: AppColors.info,
            ),
          ),
          const SizedBox(width: 8),
        ],
        _SquareAction(
          onTap: onDelete,
          backgroundColor: const Color(0xFFFFF1F2),
          borderColor: const Color(0xFFFFE4E6),
          child: const AppIcon(
            name: 'trash',
            size: 16,
            color: AppColors.danger,
          ),
        ),
      ],
    );
  }

  static String _shortDeviceId(String id) {
    final value = id.trim().toUpperCase();
    if (value.length <= 8) {
      return value;
    }
    return value.substring(0, 8);
  }
}

class _DeviceControlCard extends StatelessWidget {
  const _DeviceControlCard({
    required this.isOn,
    required this.fireLevel,
    required this.isPending,
    required this.pulseAnimation,
    required this.onToggle,
    required this.onFireLevel,
  });

  final bool isOn;
  final int fireLevel;
  final bool isPending;
  final Animation<double> pulseAnimation;
  final VoidCallback onToggle;
  final ValueChanged<int> onFireLevel;

  @override
  Widget build(BuildContext context) {
    final displayFireLevel = isOn ? fireLevel.clamp(0, 100) : 0;
    final flameColor = resolveFlameColor(isOn, displayFireLevel);
    final glowColor = resolveGlowColor(displayFireLevel);
    final flameScale = buildFlameScale(isOn, displayFireLevel);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 40),
      decoration: BoxDecoration(
        color: const Color(0xFF151619),
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 50,
            offset: Offset(0, 25),
          ),
        ],
      ),
      child: Stack(
        children: [
          const Positioned.fill(
            child: IgnorePointer(
              child: CustomPaint(painter: _DotPatternPainter()),
            ),
          ),
          Column(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.08),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isOn ? AppColors.success : AppColors.slate500,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      isOn ? '系统运行中' : '系统待命中',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 2,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 30),
              SizedBox(
                width: 260,
                height: 260,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 224,
                      height: 224,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.12),
                          width: 1,
                        ),
                      ),
                    ),
                    Container(
                      width: 192,
                      height: 192,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.06),
                          width: 2,
                        ),
                      ),
                    ),
                    if (isOn)
                      Container(
                        width: 172,
                        height: 172,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: glowColor.withValues(alpha: 0.28),
                              blurRadius: 64,
                              spreadRadius: 6,
                            ),
                          ],
                        ),
                      ),
                    SizedBox(
                      width: 260,
                      height: 260,
                      child: CustomPaint(
                        painter: _ProgressRingPainter(
                          progress: displayFireLevel.toDouble(),
                          color: isOn ? flameColor : const Color(0xFF1E293B),
                        ),
                      ),
                    ),
                    AnimatedScale(
                      scale: flameScale,
                      duration: const Duration(milliseconds: 500),
                      curve: Curves.easeOutCubic,
                      child: Opacity(
                        opacity: isOn ? 1 : 0.3,
                        child: AppIcon(
                          name: 'flame',
                          size: 80,
                          color: isOn ? flameColor : const Color(0xFF334155),
                          filled: true,
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF151619),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.08),
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              displayFireLevel.toString().padLeft(2, '0'),
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                                fontFamily: 'Courier New',
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Padding(
                              padding: EdgeInsets.only(bottom: 4),
                              child: Text(
                                '%',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppColors.slate500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 40),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  children: [
                    const Row(
                      children: [
                        Text(
                          '火力调节',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 2,
                            color: AppColors.slate500,
                          ),
                        ),
                        Spacer(),
                        Text(
                          '步进：20%',
                          style: TextStyle(
                            fontSize: 10,
                            fontFamily: 'Courier New',
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: fireLevels.map((level) {
                        final active = isOn && displayFireLevel == level;
                        return Expanded(
                          child: Padding(
                            padding: EdgeInsets.only(
                                right: level == fireLevels.last ? 0 : 8),
                            child: _FireLevelButton(
                              level: level,
                              active: active,
                              enabled: isOn && !isPending,
                              reached: isOn && displayFireLevel >= level,
                              onTap: () => onFireLevel(level),
                            ),
                          ),
                        );
                      }).toList(growable: false),
                    ),
                    const SizedBox(height: 26),
                    Center(
                      child: _PowerButton(
                        isOn: isOn,
                        isPending: isPending,
                        pulseAnimation: pulseAnimation,
                        onTap: onToggle,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DeviceStatCard extends StatelessWidget {
  const _DeviceStatCard({
    required this.iconName,
    required this.iconColor,
    required this.iconBackground,
    required this.label,
    required this.value,
  });

  final String iconName;
  final Color iconColor;
  final Color iconBackground;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: iconBackground,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Center(
              child: AppIcon(
                name: iconName,
                size: 18,
                color: iconColor,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: AppColors.slate500),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              fontFamily: AppTypography.displayFont,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _CookingModeCard extends StatelessWidget {
  const _CookingModeCard({
    required this.mode,
    required this.active,
    required this.enabled,
    required this.pulseAnimation,
    required this.onTap,
  });

  final CookingMode mode;
  final bool active;
  final bool enabled;
  final Animation<double> pulseAnimation;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled || active ? 1 : 0.55,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: active ? const Color(0xFFFED7AA) : AppColors.cardBorder,
            ),
            boxShadow: active
                ? const [
                    BoxShadow(
                      color: Color(0x14F97316),
                      blurRadius: 22,
                      offset: Offset(0, 8),
                    ),
                  ]
                : null,
          ),
          child: Stack(
            children: [
              if (active)
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Color(0x0DF97316),
                          Color(0x00FFFFFF),
                        ],
                      ),
                    ),
                  ),
                ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: active ? mode.background : AppColors.slate50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: AppIcon(
                        name: mode.icon,
                        size: 20,
                        color: mode.color,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          mode.title,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      if (active) _ModeBars(animation: pulseAnimation),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    mode.desc,
                    style: const TextStyle(
                      fontSize: 10,
                      height: 1.4,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
              if (active)
                const Positioned(
                  top: 0,
                  right: 0,
                  child: AppIcon(
                    name: 'check',
                    size: 14,
                    color: AppColors.primary,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DeviceDetailEmptyState extends StatelessWidget {
  const _DeviceDetailEmptyState({
    required this.isLoading,
    required this.error,
    required this.onRetry,
  });

  final bool isLoading;
  final String? error;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRetry,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 40, 20, 24),
        children: [
          SizedBox(
            height: 420,
            child: Center(
              child: isLoading
                  ? const CircularProgressIndicator()
                  : Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const AppIcon(
                          name: 'info',
                          size: 24,
                          color: AppColors.slate400,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          error?.trim().isNotEmpty == true
                              ? error!.trim()
                              : '未找到设备信息',
                          style: const TextStyle(color: AppColors.slate500),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        OutlinedButton(
                          onPressed: onRetry,
                          child: const Text('重新加载'),
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

class _SquareAction extends StatelessWidget {
  const _SquareAction({
    required this.onTap,
    required this.child,
    this.backgroundColor = Colors.white,
    this.borderColor = AppColors.border,
  });

  final VoidCallback onTap;
  final Widget child;
  final Color backgroundColor;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: borderColor),
        ),
        child: Center(child: child),
      ),
    );
  }
}

class _FireLevelButton extends StatelessWidget {
  const _FireLevelButton({
    required this.level,
    required this.active,
    required this.enabled,
    required this.reached,
    required this.onTap,
  });

  final int level;
  final bool active;
  final bool enabled;
  final bool reached;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled || active ? 1 : 0.5,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(14),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          height: 52,
          decoration: BoxDecoration(
            color: active
                ? AppColors.primary
                : Colors.white.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: active
                  ? const Color(0xFFFB923C)
                  : Colors.white.withValues(alpha: 0.08),
            ),
            boxShadow: active
                ? const [
                    BoxShadow(
                      color: Color(0x47F97316),
                      blurRadius: 18,
                    ),
                  ]
                : null,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '$level%',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: reached
                      ? Colors.white
                      : Colors.white.withValues(alpha: 0.2),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PowerButton extends StatelessWidget {
  const _PowerButton({
    required this.isOn,
    required this.isPending,
    required this.pulseAnimation,
    required this.onTap,
  });

  final bool isOn;
  final bool isPending;
  final Animation<double> pulseAnimation;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 80,
      height: 80,
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (isOn && !isPending)
            AnimatedBuilder(
              animation: pulseAnimation,
              builder: (context, child) {
                final scale = 1 + pulseAnimation.value * 0.42;
                final opacity =
                    (1 - pulseAnimation.value).clamp(0.0, 1.0) * 0.2;
                return Transform.scale(
                  scale: scale,
                  child: Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: AppColors.danger.withValues(alpha: opacity),
                      shape: BoxShape.circle,
                    ),
                  ),
                );
              },
            ),
          InkWell(
            onTap: isPending ? null : onTap,
            borderRadius: BorderRadius.circular(999),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 400),
              width: isOn ? 88 : 80,
              height: isOn ? 88 : 80,
              decoration: BoxDecoration(
                color: isOn
                    ? AppColors.danger
                    : Colors.white.withValues(alpha: 0.06),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                boxShadow: isOn
                    ? const [
                        BoxShadow(
                          color: Color(0x52F43F5E),
                          blurRadius: 28,
                        ),
                      ]
                    : null,
              ),
              child: Center(
                child: AppIcon(
                  name: isPending ? 'loader' : 'power',
                  size: 32,
                  color: isOn ? Colors.white : AppColors.slate500,
                  animated: isPending,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ModeBars extends StatelessWidget {
  const _ModeBars({required this.animation});

  final Animation<double> animation;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: animation,
      builder: (context, child) {
        return Row(
          children: [
            _AnimatedBar(height: _barHeight(animation.value, 0.0)),
            const SizedBox(width: 2),
            _AnimatedBar(height: _barHeight(animation.value, 0.2)),
            const SizedBox(width: 2),
            _AnimatedBar(height: _barHeight(animation.value, 0.4)),
          ],
        );
      },
    );
  }

  double _barHeight(double value, double phase) {
    final wave = (math.sin((value + phase) * math.pi * 2) + 1) / 2;
    return 4 + wave * 4;
  }
}

class _AnimatedBar extends StatelessWidget {
  const _AnimatedBar({required this.height});

  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 2,
      height: height,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(999),
      ),
    );
  }
}

class _ModalMask extends StatelessWidget {
  const _ModalMask({required this.onDismiss, required this.child});

  final VoidCallback? onDismiss;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onDismiss,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 2, sigmaY: 2),
          child: Container(
            padding: const EdgeInsets.all(20),
            color: AppColors.maskBg,
            alignment: Alignment.center,
            child: GestureDetector(
              onTap: () {},
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

class _ModalActionButton extends StatelessWidget {
  const _ModalActionButton({
    required this.label,
    required this.backgroundColor,
    required this.textColor,
    required this.onTap,
  });

  final String label;
  final Color backgroundColor;
  final Color textColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        height: 46,
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(16),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            color: textColor,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _CompactPrimaryButton extends StatelessWidget {
  const _CompactPrimaryButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        height: 48,
        constraints: const BoxConstraints(minWidth: 72),
        padding: const EdgeInsets.symmetric(horizontal: 18),
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(16),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _ProgressRingPainter extends CustomPainter {
  const _ProgressRingPainter({required this.progress, required this.color});

  final double progress;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.shortestSide / 2 - 20;
    final rect = Rect.fromCircle(center: center, radius: radius);

    final trackPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.05)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4;

    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, trackPaint);
    final sweep = (progress.clamp(0, 100) / 100) * math.pi * 2;
    canvas.drawArc(rect, -math.pi / 2, sweep, false, progressPaint);
  }

  @override
  bool shouldRepaint(covariant _ProgressRingPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.color != color;
  }
}

class _DotPatternPainter extends CustomPainter {
  const _DotPatternPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.white.withValues(alpha: 0.05);
    for (double x = 0; x <= size.width; x += 20) {
      for (double y = 0; y <= size.height; y += 20) {
        canvas.drawCircle(Offset(x + 1, y + 1), 1, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _SharedUserItem {
  const _SharedUserItem({required this.uid, required this.displayName});

  final String uid;
  final String displayName;
}
