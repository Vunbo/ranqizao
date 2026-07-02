import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../models/device.dart';

class DeviceCard extends StatelessWidget {
  const DeviceCard({
    super.key,
    required this.device,
    this.onTap,
  });

  final Device device;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: _statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  device.isOn ? Icons.local_fire_department : Icons.devices,
                  color: _statusColor,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      device.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        _statusBadge(),
                        const SizedBox(width: 8),
                        Text(
                          'SN: ${device.sn}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (device.isOn)
                Column(
                  children: [
                    const Icon(
                      Icons.local_fire_department,
                      color: AppColors.primary,
                      size: 20,
                    ),
                    Text(
                      '${device.fireLevel}%',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Color get _statusColor {
    if (!device.online) {
      return AppColors.textSecondary;
    }
    if (device.locked) {
      return AppColors.danger;
    }
    if (device.status == DeviceStatus.alert) {
      return AppColors.warning;
    }
    return AppColors.success;
  }

  Widget _statusBadge() {
    String label;
    Color color;

    if (!device.online) {
      label = '离线';
      color = AppColors.textSecondary;
    } else if (device.locked) {
      label = '已锁定';
      color = AppColors.danger;
    } else if (device.status == DeviceStatus.alert) {
      label = '告警';
      color = AppColors.warning;
    } else {
      label = '在线';
      color = AppColors.success;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
