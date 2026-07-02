import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme.dart';
import '../../models/alert.dart';
import '../../providers/alert_provider.dart';

class AlertsPage extends ConsumerStatefulWidget {
  const AlertsPage({super.key});

  @override
  ConsumerState<AlertsPage> createState() => _AlertsPageState();
}

class _AlertsPageState extends ConsumerState<AlertsPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(alertProvider.notifier).loadAlerts());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(alertProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('告警中心')),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.alerts.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.check_circle,
                        size: 64,
                        color: AppColors.success.withValues(alpha: 0.5),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        '暂无告警',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () => ref.read(alertProvider.notifier).loadAlerts(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: state.alerts.length,
                    itemBuilder: (_, index) => _AlertItem(
                      alert: state.alerts[index],
                      onTap: () => _showDetail(state.alerts[index]),
                    ),
                  ),
                ),
    );
  }

  void _showDetail(Alert alert) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _AlertDetailSheet(
        alert: alert,
        onRead: () => ref.read(alertProvider.notifier).markRead(alert.id),
        onAck: () => ref.read(alertProvider.notifier).ack(alert.id),
      ),
    );
  }
}

class _AlertItem extends StatelessWidget {
  const _AlertItem({required this.alert, required this.onTap});

  final Alert alert;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: _levelColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.warning_amber, color: _levelColor, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        alert.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        alert.message,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _LevelBadge(level: alert.level, color: _levelColor),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color get _levelColor {
    switch (alert.level) {
      case AlertLevel.critical:
        return AppColors.danger;
      case AlertLevel.high:
        return AppColors.warning;
      case AlertLevel.normal:
        return AppColors.textSecondary;
    }
  }
}

class _LevelBadge extends StatelessWidget {
  const _LevelBadge({required this.level, required this.color});

  final AlertLevel level;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        switch (level) {
          AlertLevel.critical => '严重',
          AlertLevel.high => '高危',
          AlertLevel.normal => '普通',
        },
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}

class _AlertDetailSheet extends StatelessWidget {
  const _AlertDetailSheet({
    required this.alert,
    required this.onRead,
    required this.onAck,
  });

  final Alert alert;
  final VoidCallback onRead;
  final VoidCallback onAck;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            alert.title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            alert.message,
            style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          if (alert.suggestion != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.lightbulb_outline, color: AppColors.primary, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(alert.suggestion!, style: const TextStyle(fontSize: 13)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
          const Divider(),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    onRead();
                    Navigator.pop(context);
                  },
                  child: const Text('标记已读'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    onAck();
                    Navigator.pop(context);
                  },
                  child: const Text('确认处理'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
