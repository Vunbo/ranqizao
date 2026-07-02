import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme.dart';
import '../../../core/user_identity.dart';
import '../../../models/device.dart';
import '../../../models/user.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/device_provider.dart';
import '../../../services/api_client.dart';
import '../../../widgets/app_icon.dart';
import 'profile_subview_scaffold.dart';

class DeviceManagementView extends ConsumerStatefulWidget {
  const DeviceManagementView({
    super.key,
    required this.onBack,
    required this.onMessage,
  });

  final VoidCallback onBack;
  final void Function(String message, {required bool isError}) onMessage;

  @override
  ConsumerState<DeviceManagementView> createState() =>
      _DeviceManagementViewState();
}

class _DeviceManagementViewState extends ConsumerState<DeviceManagementView> {
  static const List<_DeviceFilterTab> _filterTabs = [
    _DeviceFilterTab(id: 'all', label: '全部'),
    _DeviceFilterTab(id: 'mine', label: '我的'),
    _DeviceFilterTab(id: 'shared', label: '共享'),
  ];

  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _renameController = TextEditingController();

  String _searchQuery = '';
  String _filterTab = 'all';
  String _renamingDeviceId = '';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _searchController.dispose();
    _renameController.dispose();
    super.dispose();
  }

  void _startRename(Device device) {
    if (_isSubmitting) {
      return;
    }

    setState(() {
      _renamingDeviceId = device.id;
      _renameController.text = device.name;
    });
  }

  void _cancelRename() {
    if (_isSubmitting) {
      return;
    }

    setState(() {
      _renamingDeviceId = '';
      _renameController.clear();
    });
  }

  Future<void> _handleRename(Device device, List<Device> devices) async {
    if (_isSubmitting) {
      return;
    }

    final normalizedName = _renameController.text.trim();
    if (normalizedName.isEmpty) {
      return;
    }

    final hasDuplicate = devices.any((item) {
      return item.id != device.id &&
          item.name.trim().toLowerCase() == normalizedName.toLowerCase();
    });
    if (hasDuplicate) {
      widget.onMessage('设备名称已存在，请更换一个名称。', isError: true);
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      await ref.read(deviceProvider.notifier).updateDevice(
        device.id,
        {'name': normalizedName},
      );
      if (!mounted) {
        return;
      }

      setState(() {
        _isSubmitting = false;
        _renamingDeviceId = '';
        _renameController.clear();
      });
      widget.onMessage('设备重命名成功', isError: false);
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isSubmitting = false;
      });
      widget.onMessage(
        extractErrorMessage(error, fallback: '重命名失败'),
        isError: true,
      );
    }
  }

  Future<void> _handleDelete(Device device) async {
    if (_isSubmitting) {
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
          title: const Text('删除设备', style: AppTypography.h3),
          content: Text(
            '确定要删除设备“${device.name}”吗？此操作不可撤销。',
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
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.danger,
                    ),
                    onPressed: () => Navigator.of(dialogContext).pop(true),
                    child: const Text('确认删除'),
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );

    if (confirmed != true) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      await ref.read(deviceProvider.notifier).deleteDevice(device.id);
      if (!mounted) {
        return;
      }

      setState(() {
        _isSubmitting = false;
        if (_renamingDeviceId == device.id) {
          _renamingDeviceId = '';
          _renameController.clear();
        }
      });
      widget.onMessage('设备已删除', isError: false);
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isSubmitting = false;
      });
      widget.onMessage(
        extractErrorMessage(error, fallback: '删除失败'),
        isError: true,
      );
    }
  }

  List<Device> _buildFilteredDevices(List<Device> devices, User? user) {
    final normalizedQuery = _searchQuery.trim().toLowerCase();

    return devices.where((device) {
      final matchesSearch =
          device.name.trim().toLowerCase().contains(normalizedQuery);
      final isOwner = isDeviceOwnedByUser(device, user);

      if (_filterTab == 'mine') {
        return matchesSearch && isOwner;
      }

      if (_filterTab == 'shared') {
        return matchesSearch && !isOwner;
      }

      return matchesSearch;
    }).toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final deviceState = ref.watch(deviceProvider);
    final user = authState.user;
    final filteredDevices = _buildFilteredDevices(deviceState.devices, user);

    return ProfileSubviewScaffold(
      title: '设备管理',
      onBack: widget.onBack,
      child: deviceState.isLoading && deviceState.devices.isEmpty
          ? const Center(
              child: SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              child: Column(
                children: [
                  _buildSearchField(),
                  const SizedBox(height: 12),
                  _buildFilterTabs(),
                  const SizedBox(height: 16),
                  if (filteredDevices.isEmpty)
                    _buildEmptyState()
                  else
                    ...filteredDevices.asMap().entries.map((entry) {
                      return _buildDeviceCard(
                        device: entry.value,
                        user: user,
                        devices: deviceState.devices,
                        marginBottom:
                            entry.key == filteredDevices.length - 1 ? 0 : 12,
                      );
                    }),
                ],
              ),
            ),
    );
  }

  Widget _buildSearchField() {
    return Container(
      height: 48,
      padding: const EdgeInsets.only(left: 14, right: 14),
      decoration: BoxDecoration(
        color: AppColors.slate100,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          const AppIcon(
            name: 'search',
            size: 14,
            color: AppColors.textSecondary,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _searchController,
              onChanged: (value) {
                setState(() {
                  _searchQuery = value;
                });
              },
              decoration: const InputDecoration(
                hintText: '搜索设备名称...',
                hintStyle: TextStyle(color: AppColors.textSecondary),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
              ),
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterTabs() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.slate200,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: _filterTabs.map((tab) {
          final isActive = _filterTab == tab.id;
          return Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _filterTab = tab.id;
                });
              },
              child: Container(
                height: 38,
                decoration: BoxDecoration(
                  color: isActive ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(
                  tab.label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: isActive ? AppColors.primary : AppColors.slate600,
                  ),
                ),
              ),
            ),
          );
        }).toList(growable: false),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppColors.slate50,
              borderRadius: BorderRadius.circular(32),
            ),
            child: const Center(
              child: AppIcon(
                name: 'search',
                size: 28,
                color: AppColors.slate300,
              ),
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            '未找到相关设备',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceCard({
    required Device device,
    required User? user,
    required List<Device> devices,
    required double marginBottom,
  }) {
    final isOwner = isDeviceOwnedByUser(device, user);
    final isRenaming = _renamingDeviceId == device.id;

    return ProfileSurfaceCard(
      margin: EdgeInsets.only(bottom: marginBottom),
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  margin: const EdgeInsets.only(right: 12),
                  decoration: BoxDecoration(
                    color: device.isOn
                        ? const Color(0xFFFFF7ED)
                        : AppColors.slate50,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Center(
                    child: AppIcon(
                      name: 'flame',
                      size: 20,
                      color: device.isOn
                          ? AppColors.primary
                          : AppColors.textSecondary,
                    ),
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (isRenaming)
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                height: 34,
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 10),
                                decoration: BoxDecoration(
                                  color: AppColors.slate50,
                                  border: Border.all(color: AppColors.slate200),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: TextField(
                                  controller: _renameController,
                                  enabled: !_isSubmitting,
                                  autofocus: true,
                                  textInputAction: TextInputAction.done,
                                  onSubmitted: (_) =>
                                      _handleRename(device, devices),
                                  decoration: const InputDecoration(
                                    hintText: '设备名称',
                                    hintStyle: TextStyle(
                                      color: AppColors.textSecondary,
                                    ),
                                    border: InputBorder.none,
                                    enabledBorder: InputBorder.none,
                                    focusedBorder: InputBorder.none,
                                    filled: false,
                                  ),
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 4),
                            _RenameActionButton(
                              icon: 'check',
                              iconColor: AppColors.success,
                              backgroundColor: const Color(0xFFECFDF5),
                              onTap: _isSubmitting
                                  ? null
                                  : () => _handleRename(device, devices),
                            ),
                            const SizedBox(width: 4),
                            _RenameActionButton(
                              icon: 'close',
                              iconColor: AppColors.textSecondary,
                              backgroundColor: Colors.transparent,
                              onTap: _isSubmitting ? null : _cancelRename,
                            ),
                          ],
                        )
                      else
                        Text(
                          device.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: device.isOn
                                  ? AppColors.success
                                  : AppColors.slate300,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              '${device.isOn ? '运行中' : '待机中'} · ${isOwner ? '我的设备' : '共享设备'}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (isOwner && !isRenaming) ...[
            const SizedBox(width: 12),
            _IconActionButton(
              icon: 'edit',
              color: AppColors.slate600,
              onTap: _isSubmitting ? null : () => _startRename(device),
            ),
            const SizedBox(width: 4),
            _IconActionButton(
              icon: 'trash',
              color: AppColors.danger,
              onTap: _isSubmitting ? null : () => _handleDelete(device),
            ),
          ],
        ],
      ),
    );
  }
}

class _DeviceFilterTab {
  const _DeviceFilterTab({
    required this.id,
    required this.label,
  });

  final String id;
  final String label;
}

class _IconActionButton extends StatelessWidget {
  const _IconActionButton({
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String icon;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 34,
        height: 34,
        child: Center(
          child: AppIcon(
            name: icon,
            size: 16,
            color: color,
          ),
        ),
      ),
    );
  }
}

class _RenameActionButton extends StatelessWidget {
  const _RenameActionButton({
    required this.icon,
    required this.iconColor,
    required this.backgroundColor,
    required this.onTap,
  });

  final String icon;
  final Color iconColor;
  final Color backgroundColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Center(
          child: AppIcon(
            name: icon,
            size: 12,
            color: iconColor,
          ),
        ),
      ),
    );
  }
}
