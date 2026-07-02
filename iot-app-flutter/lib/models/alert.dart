enum AlertLevel { critical, high, normal }
enum AlertStatus { pending, resolved, falsePositive }

class Alert {
  final String id;
  final String deviceId;
  final String deviceName;
  final AlertLevel level;
  final AlertStatus status;
  final String title;
  final String message;
  final String? suggestion;
  final String triggeredAt;
  final String? resolvedAt;

  const Alert({
    required this.id,
    required this.deviceId,
    required this.deviceName,
    required this.level,
    required this.status,
    required this.title,
    required this.message,
    this.suggestion,
    required this.triggeredAt,
    this.resolvedAt,
  });

  factory Alert.fromJson(Map<String, dynamic> json) => Alert(
        id: json['id'] ?? '',
        deviceId: json['device_id'] ?? '',
        deviceName: json['device_name'] ?? '',
        level: _parseLevel(json['level']),
        status: _parseStatus(json['status']),
        title: json['title'] ?? '',
        message: json['message'] ?? '',
        suggestion: json['suggestion'],
        triggeredAt: json['triggered_at'] ?? '',
        resolvedAt: json['resolved_at'],
      );

  static AlertLevel _parseLevel(String? level) {
    switch (level) {
      case 'critical':
        return AlertLevel.critical;
      case 'high':
        return AlertLevel.high;
      default:
        return AlertLevel.normal;
    }
  }

  static AlertStatus _parseStatus(String? status) {
    switch (status) {
      case 'resolved':
        return AlertStatus.resolved;
      case 'false_positive':
        return AlertStatus.falsePositive;
      default:
        return AlertStatus.pending;
    }
  }
}
