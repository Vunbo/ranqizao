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

class SharingManagementView extends ConsumerStatefulWidget {
  const SharingManagementView({
    super.key,
    required this.onBack,
    required this.onMessage,
  });

  final VoidCallback onBack;
  final void Function(String message, {required bool isError}) onMessage;

  @override
  ConsumerState<SharingManagementView> createState() =>
      _SharingManagementViewState();
}

class _SharingManagementViewState extends ConsumerState<SharingManagementView> {
  final TextEditingController _memberUidController = TextEditingController();

  String _mainTab = 'my';
  String _subTab = 'home';
  bool _isAddMemberModalOpen = false;
  bool _isRemoveMemberModalOpen = false;
  bool _isSubmitting = false;
  _SharingTarget? _targetResource;
  List<String> _selectedUidsToRemove = const <String>[];

  @override
  void dispose() {
    _memberUidController.dispose();
    super.dispose();
  }

  void _openAddMember({
    required _SharingResourceType type,
    required String id,
    required List<String> currentMembers,
  }) {
    setState(() {
      _targetResource = _SharingTarget(
        type: type,
        id: id,
        currentMembers: List<String>.from(currentMembers),
        displayMap: const <String, String>{},
      );
      _memberUidController.clear();
      _isAddMemberModalOpen = true;
      _isRemoveMemberModalOpen = false;
      _selectedUidsToRemove = const <String>[];
    });
  }

  void _openRemoveMember({
    required _SharingResourceType type,
    required String id,
    required List<String> currentMembers,
    required Map<String, String> displayMap,
  }) {
    if (currentMembers.isEmpty) {
      widget.onMessage('暂无可移除的成员', isError: false);
      return;
    }

    setState(() {
      _targetResource = _SharingTarget(
        type: type,
        id: id,
        currentMembers: List<String>.from(currentMembers),
        displayMap: displayMap,
      );
      _isRemoveMemberModalOpen = true;
      _isAddMemberModalOpen = false;
      _memberUidController.clear();
      _selectedUidsToRemove = const <String>[];
    });
  }

  void _closeAddMemberModal() {
    if (_isSubmitting) {
      return;
    }

    setState(() {
      _isAddMemberModalOpen = false;
      _memberUidController.clear();
      if (!_isRemoveMemberModalOpen) {
        _targetResource = null;
      }
    });
  }

  void _closeRemoveMemberModal() {
    if (_isSubmitting) {
      return;
    }

    setState(() {
      _isRemoveMemberModalOpen = false;
      _selectedUidsToRemove = const <String>[];
      if (!_isAddMemberModalOpen) {
        _targetResource = null;
      }
    });
  }

  void _toggleUid(String uid) {
    if (_isSubmitting) {
      return;
    }

    setState(() {
      if (_selectedUidsToRemove.contains(uid)) {
        _selectedUidsToRemove = _selectedUidsToRemove
            .where((item) => item != uid)
            .toList(growable: false);
        return;
      }

      _selectedUidsToRemove = List<String>.from(_selectedUidsToRemove)
        ..add(uid);
    });
  }

  Future<void> _confirmAddMember(String shortUid) async {
    final target = _targetResource;
    if (target == null) {
      return;
    }

    final uid = _memberUidController.text.trim();
    if (uid.isEmpty) {
      return;
    }

    if (uid == shortUid) {
      widget.onMessage('不能添加自己', isError: true);
      return;
    }

    if (uid.length != 8) {
      widget.onMessage('请输入 8 位 UID', isError: true);
      return;
    }

    if (target.currentMembers.contains(uid)) {
      widget.onMessage('该成员已存在', isError: false);
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      if (target.type == _SharingResourceType.home) {
        await ref.read(homeProvider.notifier).addMember(target.id, uid);
      } else {
        await ref.read(deviceProvider.notifier).shareDevice(target.id, uid);
      }

      if (!mounted) {
        return;
      }

      setState(() {
        _isSubmitting = false;
        _isAddMemberModalOpen = false;
        _targetResource = null;
        _memberUidController.clear();
      });
      widget.onMessage(
        target.type == _SharingResourceType.home ? '家庭成员添加成功' : '设备共享成功',
        isError: false,
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isSubmitting = false;
      });
      widget.onMessage(
        extractErrorMessage(error, fallback: '添加失败'),
        isError: true,
      );
    }
  }

  Future<void> _confirmRemoveMember() async {
    final target = _targetResource;
    if (target == null || _selectedUidsToRemove.isEmpty) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      if (target.type == _SharingResourceType.home) {
        await ref
            .read(homeProvider.notifier)
            .removeMembers(target.id, List<String>.from(_selectedUidsToRemove));
      } else {
        await ref.read(deviceProvider.notifier).unshareDeviceMembers(
            target.id, List<String>.from(_selectedUidsToRemove));
      }

      if (!mounted) {
        return;
      }

      setState(() {
        _isSubmitting = false;
        _isRemoveMemberModalOpen = false;
        _targetResource = null;
        _selectedUidsToRemove = const <String>[];
      });
      widget.onMessage(
        target.type == _SharingResourceType.home ? '家庭成员移除成功' : '已取消共享',
        isError: false,
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isSubmitting = false;
      });
      widget.onMessage(
        extractErrorMessage(error, fallback: '操作失败'),
        isError: true,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final deviceState = ref.watch(deviceProvider);
    final homeState = ref.watch(homeProvider);
    final shortUid = user?.shortUid.trim() ?? '';
    final ownerLabel = _resolveCurrentUserDisplayName(user, shortUid);
    final myHomes = _filterMyHomes(homeState.homes, shortUid);
    final myDevices = _filterMyDevices(deviceState.devices, shortUid);
    final friendHomes = _filterFriendHomes(homeState.homes, shortUid);
    final friendDevices = _filterFriendDevices(deviceState.devices, shortUid);
    final isInitialLoading = (homeState.isLoading || deviceState.isLoading) &&
        homeState.homes.isEmpty &&
        deviceState.devices.isEmpty;

    return ProfileSubviewScaffold(
      title: '共享管理',
      onBack: widget.onBack,
      child: Stack(
        children: [
          if (isInitialLoading)
            const Center(
              child: SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else
            SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildMainTabs(),
                  const SizedBox(height: 12),
                  _buildSubTabs(),
                  const SizedBox(height: 16),
                  _buildContent(
                    ownerLabel: ownerLabel,
                    myHomes: myHomes,
                    myDevices: myDevices,
                    friendHomes: friendHomes,
                    friendDevices: friendDevices,
                  ),
                ],
              ),
            ),
          if (_isAddMemberModalOpen) _buildAddMemberModal(shortUid),
          if (_isRemoveMemberModalOpen && _targetResource != null)
            _buildRemoveMemberModal(),
        ],
      ),
    );
  }

  Widget _buildMainTabs() {
    return Row(
      children: [
        _buildMainTab('my', '我的共享'),
        const SizedBox(width: 20),
        _buildMainTab('friends', '好友共享'),
      ],
    );
  }

  Widget _buildMainTab(String key, String label) {
    final active = _mainTab == key;
    return GestureDetector(
      onTap: () {
        if (_mainTab == key) {
          return;
        }
        setState(() {
          _mainTab = key;
        });
      },
      child: Container(
        padding: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: active ? AppColors.primary : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: active ? AppColors.textPrimary : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }

  Widget _buildSubTabs() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.slate200,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          _buildSubTab('home', '家庭共享'),
          _buildSubTab('device', '设备共享'),
        ],
      ),
    );
  }

  Widget _buildSubTab(String key, String label) {
    final active = _subTab == key;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          if (_subTab == key) {
            return;
          }
          setState(() {
            _subTab = key;
          });
        },
        child: Container(
          height: 38,
          decoration: BoxDecoration(
            color: active ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          alignment: Alignment.center,
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
    );
  }

  Widget _buildContent({
    required String ownerLabel,
    required List<Home> myHomes,
    required List<Device> myDevices,
    required List<Home> friendHomes,
    required List<Device> friendDevices,
  }) {
    if (_mainTab == 'my' && _subTab == 'home') {
      if (myHomes.isEmpty) {
        return _buildEmptyState(
          iconName: 'home',
          text: '暂无家庭共享记录',
        );
      }

      return Column(
        children: [
          for (var index = 0; index < myHomes.length; index++)
            _buildOwnedHomeCard(
              myHomes[index],
              ownerLabel,
              withBottomMargin: index < myHomes.length - 1,
            ),
        ],
      );
    }

    if (_mainTab == 'my' && _subTab == 'device') {
      if (myDevices.isEmpty) {
        return _buildEmptyState(
          iconName: 'flame',
          text: '暂无设备共享记录',
        );
      }

      return Column(
        children: [
          for (var index = 0; index < myDevices.length; index++)
            _buildOwnedDeviceCard(
              myDevices[index],
              ownerLabel,
              withBottomMargin: index < myDevices.length - 1,
            ),
        ],
      );
    }

    if (_mainTab == 'friends' && _subTab == 'home') {
      if (friendHomes.isEmpty) {
        return _buildEmptyState(
          iconName: 'users',
          text: '暂无好友共享的家庭',
        );
      }

      return Column(
        children: [
          for (var index = 0; index < friendHomes.length; index++)
            _buildFriendHomeCard(
              friendHomes[index],
              withBottomMargin: index < friendHomes.length - 1,
            ),
        ],
      );
    }

    if (friendDevices.isEmpty) {
      return _buildEmptyState(
        iconName: 'flame',
        text: '暂无好友共享的设备',
      );
    }

    return Column(
      children: [
        for (var index = 0; index < friendDevices.length; index++)
          _buildFriendDeviceCard(
            friendDevices[index],
            withBottomMargin: index < friendDevices.length - 1,
          ),
      ],
    );
  }

  Widget _buildEmptyState({
    required String iconName,
    required String text,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 46),
      child: Center(
        child: Column(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: AppColors.slate50,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: AppIcon(
                  name: iconName,
                  size: 26,
                  color: AppColors.slate300,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              text,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOwnedHomeCard(
    Home home,
    String ownerLabel, {
    required bool withBottomMargin,
  }) {
    final items = <_SharingGridItem>[
      _SharingGridItem.owner(ownerLabel),
      ...home.members.map(
        (uid) => _SharingGridItem.member(
          _resolveHomeMemberDisplayName(home, uid),
        ),
      ),
      _SharingGridItem.action(
        label: '添加',
        icon: 'plus',
        onTap: () => _openAddMember(
          type: _SharingResourceType.home,
          id: home.id,
          currentMembers: home.members,
        ),
      ),
      _SharingGridItem.action(
        label: '移除',
        icon: 'minus',
        onTap: () => _openRemoveMember(
          type: _SharingResourceType.home,
          id: home.id,
          currentMembers: home.members,
          displayMap: {
            for (final uid in home.members)
              uid: _resolveHomeMemberDisplayName(home, uid),
          },
        ),
      ),
    ];

    return ProfileSurfaceCard(
      margin: EdgeInsets.only(bottom: withBottomMargin ? 12 : 0),
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Center(
                        child: AppIcon(
                          name: 'home',
                          size: 16,
                          color: AppColors.info,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        home.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              _buildBadge(
                text: '${home.members.length} 位成员',
                backgroundColor: const Color(0xFFEFF6FF),
                textColor: AppColors.info,
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildMemberGrid(items),
        ],
      ),
    );
  }

  Widget _buildOwnedDeviceCard(
    Device device,
    String ownerLabel, {
    required bool withBottomMargin,
  }) {
    final items = <_SharingGridItem>[
      _SharingGridItem.owner(ownerLabel),
      ...device.sharedWith.map(
        (uid) => _SharingGridItem.member(
          _resolveDeviceMemberDisplayName(device, uid),
        ),
      ),
      _SharingGridItem.action(
        label: '添加',
        icon: 'plus',
        onTap: () => _openAddMember(
          type: _SharingResourceType.device,
          id: device.id,
          currentMembers: device.sharedWith,
        ),
      ),
      _SharingGridItem.action(
        label: '移除',
        icon: 'minus',
        onTap: () => _openRemoveMember(
          type: _SharingResourceType.device,
          id: device.id,
          currentMembers: device.sharedWith,
          displayMap: {
            for (final uid in device.sharedWith)
              uid: _resolveDeviceMemberDisplayName(device, uid),
          },
        ),
      ),
    ];

    return ProfileSurfaceCard(
      margin: EdgeInsets.only(bottom: withBottomMargin ? 12 : 0),
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF7ED),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Center(
                        child: AppIcon(
                          name: 'flame',
                          size: 16,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        device.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              _buildBadge(
                text: '${device.sharedWith.length} 位成员',
                backgroundColor: const Color(0xFFFFF7ED),
                textColor: AppColors.primary,
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildMemberGrid(items),
        ],
      ),
    );
  }

  Widget _buildFriendHomeCard(
    Home home, {
    required bool withBottomMargin,
  }) {
    return ProfileSurfaceCard(
      margin: EdgeInsets.only(bottom: withBottomMargin ? 12 : 0),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Center(
                    child: AppIcon(
                      name: 'home',
                      size: 16,
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
                        home.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '所有者：${_resolveOwnerDisplayName(home.ownerDisplayName, home.ownerId)}',
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
          const SizedBox(width: 12),
          _buildBadge(
            text: '已加入',
            backgroundColor: const Color(0xFFEFF6FF),
            textColor: AppColors.info,
          ),
        ],
      ),
    );
  }

  Widget _buildFriendDeviceCard(
    Device device, {
    required bool withBottomMargin,
  }) {
    return ProfileSurfaceCard(
      margin: EdgeInsets.only(bottom: withBottomMargin ? 12 : 0),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF7ED),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Center(
                    child: AppIcon(
                      name: 'flame',
                      size: 16,
                      color: AppColors.primary,
                    ),
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
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '所有者：${_resolveOwnerDisplayName(device.ownerDisplayName, device.ownerId)}',
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
          const SizedBox(width: 12),
          _buildBadge(
            text: '已共享',
            backgroundColor: const Color(0xFFFFF7ED),
            textColor: AppColors.primary,
          ),
        ],
      ),
    );
  }

  Widget _buildBadge({
    required String text,
    required Color backgroundColor,
    required Color textColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildMemberGrid(List<_SharingGridItem> items) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: items.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.72,
      ),
      itemBuilder: (context, index) {
        final item = items[index];
        final isAction = item.onTap != null;

        return GestureDetector(
          onTap: item.onTap,
          child: Column(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: isAction
                      ? Colors.transparent
                      : item.highlighted
                          ? const Color(0xFFFFEDD5)
                          : AppColors.slate100,
                  borderRadius: BorderRadius.circular(18),
                  border: isAction
                      ? Border.all(color: AppColors.slate200, width: 2)
                      : null,
                ),
                child: Center(
                  child: AppIcon(
                    name: item.icon,
                    size: item.icon == 'minus' ? 14 : 16,
                    color: item.iconColor,
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                item.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 10,
                  color: AppColors.slate500,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildAddMemberModal(String shortUid) {
    return ProfileModalMask(
      onDismiss: _closeAddMemberModal,
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
                '添加成员',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              '请输入对方的 UID，确认后立即建立共享关系',
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
                controller: _memberUidController,
                enabled: !_isSubmitting,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _confirmAddMember(shortUid),
                decoration: const InputDecoration(
                  hintText: '输入 8 位 UID',
                  hintStyle: TextStyle(color: AppColors.textSecondary),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  filled: false,
                ),
                style: const TextStyle(
                  fontFamily: 'Courier New',
                  fontSize: 14,
                ),
              ),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Text(
                '你可以在“我的”页面顶部复制自己的 UID，再发送给家人或朋友进行关联。',
                style: TextStyle(
                  fontSize: 10,
                  height: 1.8,
                  color: Color(0xFF1D4ED8),
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
                    onTap: _isSubmitting ? null : _closeAddMemberModal,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ProfileActionButton(
                    label: _isSubmitting ? '提交中...' : '确认添加',
                    backgroundColor: AppColors.primary,
                    textColor: Colors.white,
                    onTap: _isSubmitting
                        ? null
                        : () => _confirmAddMember(shortUid),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRemoveMemberModal() {
    final target = _targetResource!;

    return ProfileModalMask(
      onDismiss: _closeRemoveMemberModal,
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
                '移除成员',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              '勾选需要移除的成员',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                height: 1.5,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 6),
            for (final uid in target.currentMembers)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: GestureDetector(
                  onTap: () => _toggleUid(uid),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.slate50,
                      border: Border.all(color: AppColors.slate100),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: AppColors.slate100,
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: const Center(
                                  child: AppIcon(
                                    name: 'user',
                                    size: 16,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  target.displayMap[uid] ?? uid,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontFamily: 'Courier New',
                                    fontSize: 12,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          width: 18,
                          height: 18,
                          decoration: BoxDecoration(
                            color: _selectedUidsToRemove.contains(uid)
                                ? AppColors.danger
                                : Colors.transparent,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: _selectedUidsToRemove.contains(uid)
                                  ? AppColors.danger
                                  : AppColors.slate300,
                              width: 2,
                            ),
                          ),
                          child: _selectedUidsToRemove.contains(uid)
                              ? const Center(
                                  child: AppIcon(
                                    name: 'check',
                                    size: 10,
                                    color: Colors.white,
                                  ),
                                )
                              : null,
                        ),
                      ],
                    ),
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
                    onTap: _isSubmitting ? null : _closeRemoveMemberModal,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ProfileActionButton(
                    label: _isSubmitting
                        ? '提交中...'
                        : '确认移除 (${_selectedUidsToRemove.length})',
                    backgroundColor: AppColors.danger,
                    textColor: Colors.white,
                    onTap: _isSubmitting ? null : _confirmRemoveMember,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  List<Home> _filterMyHomes(List<Home> homes, String shortUid) {
    if (shortUid.isEmpty) {
      return const <Home>[];
    }

    return homes
        .where((home) => _isOwnedByShortUid(home.ownerId, shortUid))
        .toList(growable: false);
  }

  List<Device> _filterMyDevices(List<Device> devices, String shortUid) {
    if (shortUid.isEmpty) {
      return const <Device>[];
    }

    return devices
        .where((device) => _isOwnedByShortUid(device.ownerId, shortUid))
        .toList(growable: false);
  }

  List<Home> _filterFriendHomes(List<Home> homes, String shortUid) {
    if (shortUid.isEmpty) {
      return const <Home>[];
    }

    return homes
        .where(
          (home) =>
              !_isOwnedByShortUid(home.ownerId, shortUid) &&
              home.members.contains(shortUid),
        )
        .toList(growable: false);
  }

  List<Device> _filterFriendDevices(List<Device> devices, String shortUid) {
    if (shortUid.isEmpty) {
      return const <Device>[];
    }

    return devices
        .where(
          (device) =>
              !_isOwnedByShortUid(device.ownerId, shortUid) &&
              device.sharedWith.contains(shortUid),
        )
        .toList(growable: false);
  }

  bool _isOwnedByShortUid(String? ownerId, String shortUid) {
    return shortUid.isNotEmpty && ownerId == shortUid;
  }

  String _resolveCurrentUserDisplayName(User? user, String shortUid) {
    final displayName = user?.displayName.trim() ?? '';
    if (displayName.isNotEmpty) {
      return displayName;
    }

    if (shortUid.isNotEmpty) {
      return shortUid;
    }

    return '--------';
  }

  String _resolveOwnerDisplayName(String? ownerDisplayName, String? ownerId) {
    final name = ownerDisplayName?.trim() ?? '';
    if (name.isNotEmpty) {
      return name;
    }

    final fallback = ownerId?.trim() ?? '';
    return fallback.isNotEmpty ? fallback : '--------';
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

  String _resolveDeviceMemberDisplayName(Device device, String uid) {
    for (final profile in device.sharedWithProfiles) {
      if (profile.uid == uid) {
        final displayName = profile.displayName.trim();
        return displayName.isNotEmpty ? displayName : uid;
      }
    }

    return uid;
  }
}

enum _SharingResourceType { home, device }

class _SharingTarget {
  const _SharingTarget({
    required this.type,
    required this.id,
    required this.currentMembers,
    required this.displayMap,
  });

  final _SharingResourceType type;
  final String id;
  final List<String> currentMembers;
  final Map<String, String> displayMap;
}

class _SharingGridItem {
  const _SharingGridItem({
    required this.label,
    required this.icon,
    required this.iconColor,
    required this.highlighted,
    this.onTap,
  });

  const _SharingGridItem.owner(String label)
      : this(
          label: label,
          icon: 'user',
          iconColor: AppColors.primary,
          highlighted: true,
        );

  const _SharingGridItem.member(String label)
      : this(
          label: label,
          icon: 'user',
          iconColor: AppColors.textSecondary,
          highlighted: false,
        );

  const _SharingGridItem.action({
    required String label,
    required String icon,
    required VoidCallback onTap,
  }) : this(
          label: label,
          icon: icon,
          iconColor: AppColors.slate300,
          highlighted: false,
          onTap: onTap,
        );

  final String label;
  final String icon;
  final Color iconColor;
  final bool highlighted;
  final VoidCallback? onTap;
}
