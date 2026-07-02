import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme.dart';
import '../../../models/device.dart';
import '../../../models/home.dart';
import '../../../models/user.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/device_provider.dart';
import '../../../providers/home_provider.dart';
import '../../../services/api_client.dart';
import '../../../widgets/app_icon.dart';
import 'profile_subview_scaffold.dart';

class HomeManagementView extends ConsumerStatefulWidget {
  const HomeManagementView({
    super.key,
    required this.onBack,
    required this.onMessage,
  });

  final VoidCallback onBack;
  final void Function(String message, {required bool isError}) onMessage;

  @override
  ConsumerState<HomeManagementView> createState() => _HomeManagementViewState();
}

class _HomeManagementViewState extends ConsumerState<HomeManagementView> {
  final TextEditingController _newHomeNameController = TextEditingController();

  bool _isAddModalOpen = false;
  bool _isDeleteConfirmOpen = false;
  bool _isCreatingHome = false;
  bool _isDeletingHome = false;
  bool _isSaving = false;
  bool _isAdjusting = false;
  String _editingHomeId = '';
  List<String> _tempSelectedDeviceIds = const <String>[];

  @override
  void dispose() {
    _newHomeNameController.dispose();
    super.dispose();
  }

  Home? _findCurrentHome(List<Home> homes) {
    if (_editingHomeId.isEmpty) {
      return null;
    }

    for (final home in homes) {
      if (home.id == _editingHomeId) {
        return home;
      }
    }

    return null;
  }

  void _openAddModal() {
    setState(() {
      _newHomeNameController.clear();
      _isAddModalOpen = true;
    });
  }

  void _closeAddModal() {
    if (_isCreatingHome) {
      return;
    }

    setState(() {
      _isAddModalOpen = false;
      _newHomeNameController.clear();
    });
  }

  void _openHome(String homeId) {
    setState(() {
      _editingHomeId = homeId;
      _isAdjusting = false;
      _tempSelectedDeviceIds = const <String>[];
      _isDeleteConfirmOpen = false;
    });
  }

  void _closeDetail() {
    setState(() {
      _editingHomeId = '';
      _isAdjusting = false;
      _isDeleteConfirmOpen = false;
      _tempSelectedDeviceIds = const <String>[];
    });
  }

  void _startAdjust(Home home) {
    setState(() {
      _isAdjusting = true;
      _tempSelectedDeviceIds = List<String>.from(home.deviceIds);
    });
  }

  void _cancelAdjust() {
    if (_isSaving) {
      return;
    }

    setState(() {
      _isAdjusting = false;
      _tempSelectedDeviceIds = const <String>[];
    });
  }

  void _toggleDevice(String deviceId) {
    setState(() {
      if (_tempSelectedDeviceIds.contains(deviceId)) {
        _tempSelectedDeviceIds = _tempSelectedDeviceIds
            .where((item) => item != deviceId)
            .toList(growable: false);
        return;
      }

      _tempSelectedDeviceIds = List<String>.from(_tempSelectedDeviceIds)..add(deviceId);
    });
  }

  void _openDeleteConfirm() {
    if (_isDeletingHome) {
      return;
    }

    setState(() {
      _isDeleteConfirmOpen = true;
    });
  }

  void _closeDeleteConfirm() {
    if (_isDeletingHome) {
      return;
    }

    setState(() {
      _isDeleteConfirmOpen = false;
    });
  }

  Future<void> _handleCreateHome(List<Home> homes, User? user) async {
    final normalizedName = _newHomeNameController.text.trim();
    if (normalizedName.isEmpty || user == null) {
      return;
    }

    final shortUid = user.shortUid.trim();
    final duplicated = homes.any((home) {
      return (home.ownerId ?? '') == shortUid &&
          home.name.trim().toLowerCase() == normalizedName.toLowerCase();
    });
    if (duplicated) {
      widget.onMessage('家庭名称已存在，请更换一个名称。', isError: true);
      return;
    }

    setState(() {
      _isCreatingHome = true;
    });

    try {
      await ref.read(homeProvider.notifier).createHome(normalizedName);
      if (!mounted) {
        return;
      }

      setState(() {
        _isCreatingHome = false;
        _isAddModalOpen = false;
        _newHomeNameController.clear();
      });
      widget.onMessage('家庭创建成功', isError: false);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _isCreatingHome = false;
      });
      widget.onMessage(
        extractErrorMessage(error, fallback: '创建失败'),
        isError: true,
      );
    }
  }

  Future<void> _handleDeleteHome(Home home) async {
    setState(() {
      _isDeletingHome = true;
    });

    try {
      await ref.read(homeProvider.notifier).deleteHome(home.id);
      await ref.read(deviceProvider.notifier).loadDevices();
      if (!mounted) {
        return;
      }

      setState(() {
        _isDeletingHome = false;
        _isDeleteConfirmOpen = false;
        _editingHomeId = '';
        _isAdjusting = false;
        _tempSelectedDeviceIds = const <String>[];
      });
      widget.onMessage('家庭已删除', isError: false);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _isDeletingHome = false;
      });
      widget.onMessage(
        extractErrorMessage(error, fallback: '删除失败'),
        isError: true,
      );
    }
  }

  Future<void> _saveLinks(Home home) async {
    if (_isSaving) {
      return;
    }

    setState(() {
      _isSaving = true;
    });

    try {
      await ref
          .read(homeProvider.notifier)
          .updateHomeDeviceLinks(home.id, List<String>.from(_tempSelectedDeviceIds));
      await ref.read(deviceProvider.notifier).loadDevices();
      if (!mounted) {
        return;
      }

      setState(() {
        _isSaving = false;
        _isAdjusting = false;
      });
      widget.onMessage('关联已更新', isError: false);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _isSaving = false;
      });
      widget.onMessage(
        extractErrorMessage(error, fallback: '保存失败'),
        isError: true,
      );
    }
  }
  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final homeState = ref.watch(homeProvider);
    final deviceState = ref.watch(deviceProvider);
    final user = authState.user;
    final shortUid = user?.shortUid.trim() ?? '';
    final currentHome = _findCurrentHome(homeState.homes);
    final isShowingDetail = currentHome != null;
    final linkedDevices = currentHome == null
        ? const <Device>[]
        : deviceState.devices
            .where((device) => currentHome.deviceIds.contains(device.id))
            .toList(growable: false);
    final ownedDevices = deviceState.devices
        .where((device) => (device.ownerId ?? '') == shortUid)
        .toList(growable: false);
    final ownerDisplayName = _resolveOwnerDisplayName(currentHome, user, shortUid);
    final title = !isShowingDetail
        ? '家庭管理'
        : _isAdjusting
            ? '调整关联'
            : '${currentHome.name} 详情';

    return ProfileSubviewScaffold(
      title: title,
      onBack: isShowingDetail ? _closeDetail : widget.onBack,
      trailing: !isShowingDetail
          ? _HeaderIconButton(
              icon: 'plus',
              color: AppColors.primary,
              onTap: _openAddModal,
            )
          : !_isAdjusting
              ? _HeaderIconButton(
                  icon: 'trash',
                  color: AppColors.danger,
                  onTap: _openDeleteConfirm,
                )
              : null,
      child: Stack(
        children: [
          if (!isShowingDetail)
            _buildHomeList(homeState, user)
          else
            _buildHomeDetail(
              context,
              currentHome,
              linkedDevices,
              ownedDevices,
              ownerDisplayName,
            ),
          if (_isAddModalOpen)
            _buildAddModal(homeState.homes, user),
          if (_isDeleteConfirmOpen && currentHome != null)
            _buildDeleteConfirmModal(currentHome),
        ],
      ),
    );
  }

  Widget _buildHomeList(HomeState homeState, User? user) {
    if (homeState.isLoading && homeState.homes.isEmpty) {
      return const Center(
        child: SizedBox(
          width: 22,
          height: 22,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(
        children: [
          for (var index = 0; index < homeState.homes.length; index++)
            GestureDetector(
              onTap: () => _openHome(homeState.homes[index].id),
              child: ProfileSurfaceCard(
                margin: EdgeInsets.only(bottom: index == homeState.homes.length - 1 ? 0 : 12),
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Center(
                        child: AppIcon(
                          name: 'home',
                          size: 18,
                          color: AppColors.info,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            homeState.homes[index].name,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${homeState.homes[index].members.length} 位成员 · ${homeState.homes[index].deviceIds.length} 台设备',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const AppIcon(
                      name: 'chevron',
                      size: 16,
                      color: AppColors.slate300,
                    ),
                  ],
                ),
              ),
            ),
          if (homeState.homes.isEmpty && user != null)
            const SizedBox.shrink(),
        ],
      ),
    );
  }

  Widget _buildHomeDetail(
    BuildContext context,
    Home home,
    List<Device> linkedDevices,
    List<Device> ownedDevices,
    String ownerDisplayName,
  ) {
    final ownerInitial = _displayInitial(ownerDisplayName);

    return Stack(
      children: [
        SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
            20,
            0,
            20,
            _isAdjusting ? 116 + MediaQuery.paddingOf(context).bottom : 24,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!_isAdjusting) ...[
                _buildSectionHeader(
                  title: '已关联设备',
                  trailing: GestureDetector(
                    onTap: () => _startAdjust(home),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        '调整关联',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                if (linkedDevices.isNotEmpty)
                  _DeviceGrid(
                    devices: linkedDevices,
                    selectedDeviceIds: const <String>{},
                    selectable: false,
                    onTap: null,
                  )
                else
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Center(
                      child: Text(
                        '暂无关联设备',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                const SizedBox(height: 24),
                const Text(
                  '家庭成员',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 10),
                _buildMemberCard(
                  initial: ownerInitial,
                  name: ownerDisplayName,
                  role: '所有者',
                  highlighted: true,
                ),
                for (var index = 0; index < home.members.length; index++)
                  _buildMemberCard(
                    initial: _displayInitial(home.members[index]),
                    name: _resolveHomeMemberDisplayName(home, home.members[index]),
                    role: '家庭成员',
                    highlighted: false,
                    marginTop: 10,
                  ),
              ] else ...[
                _buildSectionHeader(
                  title: '选择设备',
                  trailing: Text(
                    '已选 ${_tempSelectedDeviceIds.length}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                _DeviceGrid(
                  devices: ownedDevices,
                  selectedDeviceIds: _tempSelectedDeviceIds.toSet(),
                  selectable: true,
                  onTap: _toggleDevice,
                ),
              ],
              const SizedBox(height: 26),
              _buildTipCard(
                _isAdjusting
                    ? '确认后，所选设备将关联到当前家庭，并自动共享给家庭成员。'
                    : '关联到当前家庭的设备会自动共享给该家庭的全部成员，你可以在共享管理中继续调整成员权限。',
              ),
            ],
          ),
        ),
        if (_isAdjusting)
          Positioned(
            left: 20,
            right: 20,
            bottom: 16 + MediaQuery.paddingOf(context).bottom,
            child: Row(
              children: [
                Expanded(
                  child: ProfileActionButton(
                    label: '取消',
                    backgroundColor: Colors.white,
                    textColor: AppColors.slate600,
                    onTap: _isSaving ? null : _cancelAdjust,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ProfileActionButton(
                    label: _isSaving ? '保存中...' : '确认调整',
                    backgroundColor: AppColors.primary,
                    textColor: Colors.white,
                    onTap: _isSaving ? null : () => _saveLinks(home),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
  Widget _buildAddModal(List<Home> homes, User? user) {
    return ProfileModalMask(
      onDismiss: _closeAddModal,
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(maxWidth: 320),
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
                '新建家庭',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 8),
            const Center(
              child: Text(
                '为您的家庭起一个温馨的名称',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
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
                controller: _newHomeNameController,
                enabled: !_isCreatingHome,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _handleCreateHome(homes, user),
                decoration: const InputDecoration(
                  hintText: '例如：幸福小家',
                  hintStyle: TextStyle(color: AppColors.textSecondary),
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
                    backgroundColor: Colors.white,
                    textColor: AppColors.slate600,
                    onTap: _isCreatingHome ? null : _closeAddModal,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ProfileActionButton(
                    label: _isCreatingHome ? '创建中...' : '创建',
                    backgroundColor: AppColors.primary,
                    textColor: Colors.white,
                    onTap: _isCreatingHome
                        ? null
                        : () => _handleCreateHome(homes, user),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDeleteConfirmModal(Home home) {
    return ProfileModalMask(
      onDismiss: _closeDeleteConfirm,
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
                '删除家庭',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '确定要删除家庭“${home.name}”吗？删除后，该家庭成员关系和设备关联关系将被移除。',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12,
                height: 1.5,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: ProfileActionButton(
                    label: '取消',
                    backgroundColor: Colors.white,
                    textColor: AppColors.slate600,
                    onTap: _isDeletingHome ? null : _closeDeleteConfirm,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ProfileActionButton(
                    label: _isDeletingHome ? '删除中...' : '确认删除',
                    backgroundColor: AppColors.danger,
                    textColor: Colors.white,
                    onTap: _isDeletingHome ? null : () => _handleDeleteHome(home),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader({
    required String title,
    Widget? trailing,
  }) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        if (trailing != null) trailing,
      ],
    );
  }

  Widget _buildMemberCard({
    required String initial,
    required String name,
    required String role,
    required bool highlighted,
    double marginTop = 0,
  }) {
    return ProfileSurfaceCard(
      margin: EdgeInsets.only(top: marginTop),
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: highlighted ? const Color(0xFFFFEDD5) : AppColors.slate100,
              borderRadius: BorderRadius.circular(16),
            ),
            alignment: Alignment.center,
            child: Text(
              initial,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: highlighted ? AppColors.primary : AppColors.textSecondary,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  role,
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
    );
  }

  Widget _buildTipCard(String text) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 1),
            child: AppIcon(
              name: 'info',
              size: 14,
              color: AppColors.info,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 11,
                height: 1.6,
                color: Color(0xFF1D4ED8),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _resolveOwnerDisplayName(Home? home, User? user, String shortUid) {
    if (home != null && (home.ownerId ?? '') != shortUid) {
      final foreignOwnerName = (home.ownerDisplayName ?? '').trim();
      if (foreignOwnerName.isNotEmpty) {
        return foreignOwnerName;
      }
    }

    final ownDisplayName = user?.displayName.trim() ?? '';
    if (ownDisplayName.isNotEmpty) {
      return ownDisplayName;
    }

    if (shortUid.isNotEmpty) {
      return shortUid;
    }

    return '--------';
  }

  String _resolveHomeMemberDisplayName(Home home, String uid) {
    for (final profile in home.memberProfiles) {
      if (profile.uid == uid) {
        final displayName = profile.displayName.trim();
        return displayName.isNotEmpty ? displayName : uid;
      }
    }

    return uid;
  }

  String _displayInitial(String value) {
    final normalized = value.trim();
    return normalized.isNotEmpty ? normalized.substring(0, 1) : '-';
  }
}

class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 24,
              offset: const Offset(0, 10),
            ),
          ],
        ),
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

class _DeviceGrid extends StatelessWidget {
  const _DeviceGrid({
    required this.devices,
    required this.selectedDeviceIds,
    required this.selectable,
    required this.onTap,
  });

  final List<Device> devices;
  final Set<String> selectedDeviceIds;
  final bool selectable;
  final ValueChanged<String>? onTap;

  @override
  Widget build(BuildContext context) {
    if (devices.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 32),
        child: Center(
          child: Text(
            '暂无可用设备',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
        ),
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: devices.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.25,
      ),
      itemBuilder: (context, index) {
        final device = devices[index];
        final selected = selectedDeviceIds.contains(device.id);

        return GestureDetector(
          onTap: selectable && onTap != null ? () => onTap!(device.id) : null,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: selected ? AppColors.primaryLight : Colors.white,
              border: Border.all(
                color: selected ? const Color(0xFFFED7AA) : AppColors.slate200,
              ),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Stack(
              children: [
                if (selected)
                  Positioned(
                    top: 0,
                    right: 0,
                    child: Container(
                      width: 18,
                      height: 18,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: AppIcon(
                          name: 'check',
                          size: 10,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    AppIcon(
                      name: 'flame',
                      size: 18,
                      color: selected ? AppColors.primary : AppColors.textSecondary,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      device.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.slate700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
