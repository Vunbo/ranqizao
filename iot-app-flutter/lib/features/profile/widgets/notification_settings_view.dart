import 'package:flutter/material.dart';

import '../../../core/theme.dart';
import '../../../widgets/app_icon.dart';
import 'profile_subview_scaffold.dart';

class NotificationSettingsView extends StatefulWidget {
  const NotificationSettingsView({
    super.key,
    required this.onBack,
  });

  final VoidCallback onBack;

  @override
  State<NotificationSettingsView> createState() =>
      _NotificationSettingsViewState();
}

class _NotificationSettingsViewState extends State<NotificationSettingsView> {
  static const List<_NotificationSettingItem> _items = [
    _NotificationSettingItem(
      id: 'safety',
      label: '安全预警',
      desc: '燃气泄漏、异常高温等紧急告警',
      icon: 'alert',
      color: AppColors.danger,
    ),
    _NotificationSettingItem(
      id: 'status',
      label: '设备状态',
      desc: '设备开关机、火力调节等状态变更',
      icon: 'activity',
      color: AppColors.primary,
    ),
    _NotificationSettingItem(
      id: 'system',
      label: '系统通知',
      desc: '固件更新、功能上线等系统消息',
      icon: 'message',
      color: AppColors.info,
    ),
  ];

  final Map<String, bool> _settings = <String, bool>{
    'safety': true,
    'status': true,
    'system': true,
  };

  void _toggle(String key) {
    setState(() {
      _settings[key] = !(_settings[key] ?? false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return ProfileSubviewScaffold(
      title: '消息通知',
      onBack: widget.onBack,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          children: [
            for (var index = 0; index < _items.length; index++)
              ProfileSurfaceCard(
                margin: EdgeInsets.only(bottom: index == _items.length - 1 ? 0 : 10),
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
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
                                name: _items[index].icon,
                                size: 18,
                                color: _items[index].color,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _items[index].label,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _items[index].desc,
                                  style: const TextStyle(
                                    fontSize: 11,
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
                    GestureDetector(
                      onTap: () => _toggle(_items[index].id),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        width: 48,
                        height: 28,
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: (_settings[_items[index].id] ?? false)
                              ? AppColors.primary
                              : AppColors.slate300,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        alignment: (_settings[_items[index].id] ?? false)
                            ? Alignment.centerRight
                            : Alignment.centerLeft,
                        child: Container(
                          width: 20,
                          height: 20,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
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

class _NotificationSettingItem {
  const _NotificationSettingItem({
    required this.id,
    required this.label,
    required this.desc,
    required this.icon,
    required this.color,
  });

  final String id;
  final String label;
  final String desc;
  final String icon;
  final Color color;
}
