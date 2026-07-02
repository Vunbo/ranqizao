import 'package:flutter/material.dart';

import '../core/theme.dart';
import 'app_icon.dart';

class BottomNav extends StatelessWidget {
  const BottomNav({
    super.key,
    required this.activeTab,
    required this.onChange,
  });

  final String activeTab;
  final ValueChanged<String> onChange;

  static const tabs = [
    _TabData(id: 'home', label: '首页', icon: 'flame'),
    _TabData(id: 'safety', label: '安全', icon: 'shield'),
    _TabData(id: 'mall', label: '商城', icon: 'bag'),
    _TabData(id: 'profile', label: '我的', icon: 'user'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(24, 0, 24, 32),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.navBg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.navBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: tabs.map((tab) {
          final isActive = activeTab == tab.id;
          return Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => onChange(tab.id),
              child: SizedBox(
                height: 58,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    if (isActive)
                      Positioned.fill(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: AppColors.primaryLight,
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      ),
                    Positioned.fill(
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            AppIcon(
                              name: tab.icon,
                              size: 20,
                              color: isActive
                                  ? AppColors.primary
                                  : AppColors.textSecondary,
                              strokeWidth: isActive ? 2.5 : 2,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              tab.label,
                              style: isActive
                                  ? AppTypography.navLabelActive
                                  : AppTypography.navLabel,
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (isActive)
                      Positioned(
                        bottom: -4,
                        left: 0,
                        right: 0,
                        child: Center(
                          child: Container(
                            width: 4,
                            height: 4,
                            decoration: const BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _TabData {
  const _TabData({required this.id, required this.label, required this.icon});

  final String id;
  final String label;
  final String icon;
}
