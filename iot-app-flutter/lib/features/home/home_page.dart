import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../core/user_identity.dart';
import '../../models/device.dart';
import '../../providers/auth_provider.dart';
import '../../providers/device_provider.dart';
import '../../widgets/app_icon.dart';
import '../scan_bind/scan_bind_flow_page.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }

      final deviceState = ref.read(deviceProvider);
      if (deviceState.hasLoaded || deviceState.isLoading) {
        return;
      }

      ref.read(deviceProvider.notifier).loadDevices();
    });
  }

  @override
  Widget build(BuildContext context) {
    final deviceState = ref.watch(deviceProvider);
    final authState = ref.watch(authProvider);
    final devices = deviceState.devices;
    final user = authState.user;
    final shortUid = resolveUserShortUid(user);

    final myDevices = devices
        .where((device) => (device.ownerId ?? '') == shortUid)
        .toList(growable: false);
    final sharedDevices = devices
        .where((device) => (device.ownerId ?? '') != shortUid)
        .toList(growable: false);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '智能安全灶',
                    style: TextStyle(
                      fontFamily: AppTypography.displayFont,
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    devices.isNotEmpty ? '已连接 ${devices.length} 台设备' : '暂无连接设备',
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
              GestureDetector(
                onTap: () => showScanBindFlowDialog(context),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.2),
                        blurRadius: 28,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AppIcon(name: 'plus', size: 16, color: Colors.white),
                      SizedBox(width: 4),
                      Text(
                        '添加设备',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          if (devices.isEmpty) ...[
            const SizedBox(height: 28),
            const _HomeEmptyState(),
          ] else ...[
            const SizedBox(height: 32),
            if (myDevices.isNotEmpty) ...[
              const Padding(
                padding: EdgeInsets.only(left: 4),
                child: Text('我的设备', style: AppTypography.sectionKicker),
              ),
              const SizedBox(height: 12),
              _DeviceGrid(
                devices: myDevices,
                onTap: (deviceId) => context.push('/device/$deviceId'),
              ),
            ],
            if (sharedDevices.isNotEmpty) ...[
              SizedBox(height: myDevices.isNotEmpty ? 28 : 0),
              const Padding(
                padding: EdgeInsets.only(left: 4),
                child: Text('共享给我的', style: AppTypography.sectionKicker),
              ),
              const SizedBox(height: 12),
              _DeviceGrid(
                devices: sharedDevices,
                onTap: (deviceId) => context.push('/device/$deviceId'),
              ),
            ],
            const SizedBox(height: 32),
          ],
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.slate900,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '安全小贴士',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        '定期检查燃气管路并保持厨房通风良好，AI 安全灶会持续守护您的烹饪安全。',
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.7,
                          color: Color(0xD1E2E8F0),
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(width: 16),
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: Color(0x14FFFFFF),
                    borderRadius: BorderRadius.all(Radius.circular(12)),
                  ),
                  child: Padding(
                    padding: EdgeInsets.all(9),
                    child: AppIcon(
                        name: 'shield', size: 18, color: AppColors.primary),
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

class _HomeEmptyState extends StatelessWidget {
  const _HomeEmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.slate100,
              borderRadius: BorderRadius.circular(40),
            ),
            child: const Center(
              child: AppIcon(
                name: 'flame',
                size: 32,
                color: AppColors.slate300,
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            '点击右上角添加您的第一台安全灶',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _DeviceGrid extends StatelessWidget {
  const _DeviceGrid({
    required this.devices,
    required this.onTap,
  });

  final List<Device> devices;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final columns = width >= 1024 ? 3 : (width >= 640 ? 2 : 1);
        const spacing = 16.0;
        final itemWidth =
            columns == 1 ? width : (width - spacing * (columns - 1)) / columns;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: devices
              .map(
                (device) => SizedBox(
                  width: itemWidth,
                  child: _DeviceCard(
                    device: device,
                    onTap: () => onTap(device.id),
                  ),
                ),
              )
              .toList(growable: false),
        );
      },
    );
  }
}

class _DeviceCard extends StatelessWidget {
  const _DeviceCard({
    required this.device,
    required this.onTap,
  });

  final Device device;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: AppColors.cardBorder),
          borderRadius: BorderRadius.circular(16),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    margin: const EdgeInsets.only(right: 14),
                    decoration: BoxDecoration(
                      color:
                          device.isOn ? AppColors.primary : AppColors.slate100,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Center(
                      child: AppIcon(
                        name: 'flame',
                        size: 22,
                        color: device.isOn
                            ? Colors.white
                            : AppColors.textSecondary,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          device.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: device.isOn
                                    ? AppColors.success
                                    : AppColors.slate300,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              device.isOn ? '运行中' : '待机',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${device.temp.toStringAsFixed(0)}°C',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        '当前温度',
                        style: TextStyle(
                          fontSize: 10,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              color: AppColors.pageBg,
              child: Row(
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        const AppIcon(
                            name: 'droplet', size: 12, color: AppColors.info),
                        const SizedBox(width: 4),
                        Text(
                          '${device.gas.toStringAsFixed(2)}% LEL',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppColors.slate600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Expanded(
                    child: Row(
                      children: [
                        AppIcon(
                            name: 'shield', size: 12, color: AppColors.success),
                        SizedBox(width: 4),
                        Text(
                          '安全',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppColors.slate600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const AppIcon(
                      name: 'chevron', size: 16, color: AppColors.slate300),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

