import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme.dart';
import '../../core/user_identity.dart';
import '../../models/device.dart';
import '../../providers/auth_provider.dart';
import '../../providers/device_provider.dart';
import '../../services/device_service.dart';
import '../../widgets/app_icon.dart';

class SafetyPage extends ConsumerStatefulWidget {
  const SafetyPage({super.key});

  @override
  ConsumerState<SafetyPage> createState() => _SafetyPageState();
}

class _SafetyPageState extends ConsumerState<SafetyPage> {
  String? _selectedDeviceId;
  bool _dropdownOpen = false;
  List<_SafetyLog> _alertLogs = const [];
  List<_SafetyLog> _logs = const [];
  ProviderSubscription<DeviceState>? _deviceSubscription;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(deviceProvider.notifier).loadDevices());

    _deviceSubscription = ref.listenManual(deviceProvider, (_, next) {
      final devices = next.devices;
      if (devices.isEmpty) {
        return;
      }

      final currentExists =
          devices.any((device) => device.id == _selectedDeviceId);
      if (_selectedDeviceId == null || !currentExists) {
        final deviceId = devices.first.id;
        setState(() {
          _selectedDeviceId = deviceId;
        });
        _loadLogs(deviceId);
      }
    });
  }

  @override
  void dispose() {
    _deviceSubscription?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final deviceState = ref.watch(deviceProvider);
    final authState = ref.watch(authProvider);
    final devices = deviceState.devices;

    if (devices.isEmpty) {
      return const Padding(
        padding: EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppIcon(name: 'shield', size: 36, color: AppColors.slate300),
              SizedBox(height: 14),
              Text(
                '请先添加设备以开启安全监控',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      );
    }

    final user = authState.user;
    final myDevices = devices
        .where((device) => isDeviceOwnedByUser(device, user))
        .toList(growable: false);
    final sharedDevices = devices
        .where((device) => !isDeviceOwnedByUser(device, user))
        .toList(growable: false);
    final currentDevice = devices.firstWhere(
      (device) => device.id == _selectedDeviceId,
      orElse: () => devices.first,
    );
    final sensors = _buildSensors(currentDevice);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '安全中心',
                    style: TextStyle(
                      fontFamily: AppTypography.displayFont,
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: 6),
                  Text(
                    '实时监控全屋厨房安全',
                    style: TextStyle(
                      fontSize: 10,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
              if (devices.length > 1)
                _DeviceDropdown(
                  currentDeviceName: currentDevice.name,
                  open: _dropdownOpen,
                  myDevices: myDevices,
                  sharedDevices: sharedDevices,
                  selectedDeviceId: currentDevice.id,
                  onToggle: () =>
                      setState(() => _dropdownOpen = !_dropdownOpen),
                  onSelect: (deviceId) {
                    setState(() {
                      _selectedDeviceId = deviceId;
                      _dropdownOpen = false;
                    });
                    _loadLogs(deviceId);
                  },
                ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color:
                  currentDevice.isOn ? AppColors.success : AppColors.slate700,
              borderRadius: BorderRadius.circular(16),
            ),
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
                          '当前安全评分',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1,
                            color: Color(0xB8FFFFFF),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          currentDevice.isOn ? '98' : '--',
                          style: const TextStyle(
                            fontSize: 44,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: AppIcon(
                            name: 'shield', size: 24, color: Colors.white),
                      ),
                    ),
                  ],
                ),
                Container(
                  margin: const EdgeInsets.only(top: 18),
                  padding: const EdgeInsets.only(top: 18),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(
                          color: Colors.white.withValues(alpha: 0.12)),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        currentDevice.isOn ? '所有传感器运行正常' : '设备待机中，基础监测仍保持开启',
                        style:
                            const TextStyle(fontSize: 11, color: Colors.white),
                      ),
                      const Text(
                        '查看报告',
                        style: TextStyle(
                          fontSize: 11,
                          decoration: TextDecoration.underline,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _SensorGrid(sensors: sensors),
          const SizedBox(height: 16),
          _LogCard(
            title: '告警记录',
            iconName: 'alert',
            iconColor: AppColors.danger,
            logs: _alertLogs,
            emptyText: '暂无告警记录',
          ),
          const SizedBox(height: 16),
          _LogCard(
            title: '操作记录',
            iconName: 'history',
            iconColor: AppColors.textSecondary,
            logs: _logs,
            emptyText: '暂无操作记录',
          ),
        ],
      ),
    );
  }

  Future<void> _loadLogs(String deviceId) async {
    try {
      final rows = await ref.read(deviceServiceProvider).logs(deviceId);
      final alertLogs = <_SafetyLog>[];
      final operationLogs = <_SafetyLog>[];

      for (final row in rows) {
        final type = (row['type'] ?? 'info').toString();
        final log = _SafetyLog(
          id: (row['id'] ?? '').toString(),
          event: (row['event'] ?? '').toString(),
          displayName: (row['displayName'] ??
                  row['display_name'] ??
                  row['ownerId'] ??
                  '')
              .toString(),
          time:
              _formatDate((row['createdAt'] ?? row['created_at'])?.toString()),
          type: type,
        );

        if (type == 'alert' || type == 'warning') {
          alertLogs.add(log);
        } else {
          operationLogs.add(log);
        }
      }

      if (!mounted) return;
      setState(() {
        _alertLogs = alertLogs;
        _logs = operationLogs;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _alertLogs = const [];
        _logs = const [];
      });
    }
  }

  List<_SensorData> _buildSensors(Device device) {
    final isOn = device.isOn;

    return [
      _SensorData(
        label: '温度',
        value: isOn ? '${device.temp.toStringAsFixed(0)}°C' : '--',
        icon: 'thermometer',
        status: _SensorStatus.safe,
      ),
      _SensorData(
        label: '湿度',
        value: isOn ? '58%' : '--',
        icon: 'droplet',
        status: _SensorStatus.safe,
      ),
      _SensorData(
        label: '燃气泄漏',
        value: isOn ? '${device.gas.toStringAsFixed(2)}%' : '--',
        icon: 'flame',
        status: device.gas >= 0.1 ? _SensorStatus.warning : _SensorStatus.safe,
      ),
      _SensorData(
        label: '烟雾浓度',
        value: isOn ? (device.smoke >= 10 ? '异常' : '正常') : '--',
        icon: 'alert',
        status: device.smoke >= 10 ? _SensorStatus.danger : _SensorStatus.safe,
      ),
    ];
  }

  String _formatDate(String? raw) {
    if (raw == null || raw.isEmpty) {
      return '';
    }

    final date = DateTime.tryParse(raw);
    if (date == null) {
      return raw;
    }

    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    final hour = date.hour.toString().padLeft(2, '0');
    final minute = date.minute.toString().padLeft(2, '0');
    return '$month/$day $hour:$minute';
  }
}

class _DeviceDropdown extends StatelessWidget {
  const _DeviceDropdown({
    required this.currentDeviceName,
    required this.open,
    required this.myDevices,
    required this.sharedDevices,
    required this.selectedDeviceId,
    required this.onToggle,
    required this.onSelect,
  });

  final String currentDeviceName;
  final bool open;
  final List<Device> myDevices;
  final List<Device> sharedDevices;
  final String selectedDeviceId;
  final VoidCallback onToggle;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        GestureDetector(
          onTap: onToggle,
          child: Container(
            constraints: const BoxConstraints(minWidth: 120, maxWidth: 148),
            padding: const EdgeInsets.symmetric(horizontal: 14),
            height: 40,
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    currentDeviceName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.slate700,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                const AppIcon(
                    name: 'chevron', size: 14, color: AppColors.textSecondary),
              ],
            ),
          ),
        ),
        if (open)
          Positioned(
            top: 48,
            right: 0,
            child: Material(
              color: Colors.transparent,
              child: Container(
                width: 224,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: AppColors.cardBorder),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.12),
                      blurRadius: 40,
                      offset: const Offset(0, 18),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (myDevices.isNotEmpty) ...[
                      const Padding(
                        padding: EdgeInsets.fromLTRB(10, 8, 10, 8),
                        child: Text('我的设备', style: AppTypography.sectionKicker),
                      ),
                      ...myDevices.map((device) => _DropdownRow(
                            device: device,
                            active: selectedDeviceId == device.id,
                            onTap: () => onSelect(device.id),
                          )),
                    ],
                    if (sharedDevices.isNotEmpty) ...[
                      const Padding(
                        padding: EdgeInsets.fromLTRB(10, 8, 10, 8),
                        child: Text('共享设备', style: AppTypography.sectionKicker),
                      ),
                      ...sharedDevices.map((device) => _DropdownRow(
                            device: device,
                            active: selectedDeviceId == device.id,
                            onTap: () => onSelect(device.id),
                          )),
                    ],
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _DropdownRow extends StatelessWidget {
  const _DropdownRow({
    required this.device,
    required this.active,
    required this.onTap,
  });

  final Device device;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 40,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: active ? AppColors.primaryLight : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                device.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: active ? AppColors.primary : AppColors.slate600,
                ),
              ),
            ),
            if (active)
              const AppIcon(name: 'check', size: 12, color: AppColors.primary),
          ],
        ),
      ),
    );
  }
}

class _SensorGrid extends StatelessWidget {
  const _SensorGrid({required this.sensors});

  final List<_SensorData> sensors;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final columns =
            width >= 1280 ? 6 : (width >= 1024 ? 4 : (width >= 640 ? 3 : 2));
        const spacing = 12.0;
        final itemWidth = (width - spacing * (columns - 1)) / columns;

        return Padding(
          padding: const EdgeInsets.only(top: 16),
          child: Wrap(
            spacing: spacing,
            runSpacing: spacing,
            children: sensors
                .map(
                  (sensor) => SizedBox(
                    width: itemWidth,
                    child: _SensorCard(sensor: sensor),
                  ),
                )
                .toList(growable: false),
          ),
        );
      },
    );
  }
}

class _SensorCard extends StatelessWidget {
  const _SensorCard({required this.sensor});

  final _SensorData sensor;

  @override
  Widget build(BuildContext context) {
    final bgColor = switch (sensor.status) {
      _SensorStatus.safe => const Color(0xFFECFDF5),
      _SensorStatus.warning => const Color(0xFFFFFBEB),
      _SensorStatus.danger => const Color(0xFFFFF1F2),
    };
    final iconColor = switch (sensor.status) {
      _SensorStatus.safe => AppColors.success,
      _SensorStatus.warning => AppColors.warning,
      _SensorStatus.danger => AppColors.danger,
    };

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.cardBorder),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: AppIcon(name: sensor.icon, size: 16, color: iconColor),
                ),
              ),
              Container(
                width: 8,
                height: 8,
                decoration:
                    BoxDecoration(color: iconColor, shape: BoxShape.circle),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            sensor.label,
            style:
                const TextStyle(fontSize: 11, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 6),
          Text(
            sensor.value,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _LogCard extends StatelessWidget {
  const _LogCard({
    required this.title,
    required this.iconName,
    required this.iconColor,
    required this.logs,
    required this.emptyText,
  });

  final String title;
  final String iconName;
  final Color iconColor;
  final List<_SafetyLog> logs;
  final String emptyText;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.cardBorder),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                AppIcon(name: iconName, size: 14, color: iconColor),
              ],
            ),
          ),
          Container(height: 1, color: AppColors.cardBorder),
          if (logs.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 30),
              child: Text(
                emptyText,
                style: const TextStyle(
                    fontSize: 12, color: AppColors.textSecondary),
              ),
            )
          else
            ...logs.map(
              (log) => Container(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                decoration: const BoxDecoration(
                  border: Border(top: BorderSide(color: AppColors.pageBg)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      margin: const EdgeInsets.only(top: 6),
                      decoration: BoxDecoration(
                        color: switch (log.type) {
                          'warning' => AppColors.warning,
                          'danger' || 'alert' => AppColors.danger,
                          'success' => AppColors.success,
                          _ => AppColors.info,
                        },
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            log.event,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            log.displayName,
                            style: const TextStyle(
                              fontSize: 10,
                              color: AppColors.textMuted,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            log.time,
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
            ),
        ],
      ),
    );
  }
}

enum _SensorStatus { safe, warning, danger }

class _SensorData {
  const _SensorData({
    required this.label,
    required this.value,
    required this.icon,
    required this.status,
  });

  final String label;
  final String value;
  final String icon;
  final _SensorStatus status;
}

class _SafetyLog {
  const _SafetyLog({
    required this.id,
    required this.event,
    required this.displayName,
    required this.time,
    required this.type,
  });

  final String id;
  final String event;
  final String displayName;
  final String time;
  final String type;
}
