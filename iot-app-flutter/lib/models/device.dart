enum OnlineStatus { online, weak, offline }

enum FireStatus { off, igniting, on, fault }

enum DeviceStatus { normal, alert, locked, offline }

class SharedProfile {
  final String uid;
  final String displayName;

  const SharedProfile({
    required this.uid,
    required this.displayName,
  });

  factory SharedProfile.fromJson(Map<String, dynamic> json) {
    final uid = (json['uid'] ?? json['id'] ?? '').toString();
    final displayName =
        (json['displayName'] ?? json['display_name'] ?? uid).toString();

    return SharedProfile(uid: uid, displayName: displayName);
  }
}

class Device {
  final String id;
  final String sn;
  final String name;
  final String? model;
  final String? location;
  final bool online;
  final bool isOn;
  final int fireLevel;
  final double temp;
  final double gas;
  final double smoke;
  final double flow;
  final bool humanDetected;
  final bool vibration;
  final bool locked;
  final String valveStatus;
  final String? lastHeartbeatAt;
  final String? firmwareVersion;
  final String? ownerId;
  final String? ownerDisplayName;
  final List<String> sharedWith;
  final List<SharedProfile> sharedWithProfiles;

  const Device({
    required this.id,
    required this.sn,
    required this.name,
    this.model,
    this.location,
    required this.online,
    required this.isOn,
    required this.fireLevel,
    required this.temp,
    required this.gas,
    required this.smoke,
    required this.flow,
    required this.humanDetected,
    required this.vibration,
    required this.locked,
    required this.valveStatus,
    this.lastHeartbeatAt,
    this.firmwareVersion,
    this.ownerId,
    this.ownerDisplayName,
    this.sharedWith = const [],
    this.sharedWithProfiles = const [],
  });

  DeviceStatus get status {
    if (!online) return DeviceStatus.offline;
    if (locked) return DeviceStatus.locked;
    if (gas >= 0.1 || smoke >= 10 || vibration) return DeviceStatus.alert;
    return DeviceStatus.normal;
  }

  OnlineStatus get onlineStatus {
    if (!online) return OnlineStatus.offline;
    if (lastHeartbeatAt != null) return OnlineStatus.online;
    return OnlineStatus.weak;
  }

  FireStatus get fireStatus {
    if (!isOn) return FireStatus.off;
    return FireStatus.on;
  }

  factory Device.fromJson(Map<String, dynamic> json) => Device(
        id: (json['id'] ?? '').toString(),
        sn: (json['sn'] ?? json['serialNumber'] ?? json['serial_number'] ?? '')
            .toString(),
        name: (json['name'] ?? '').toString(),
        model: _readNullableString(json['model'] ?? json['productModel'] ?? json['product_model']),
        location: _resolveLocationText(json['location']),
        online: _readBool(json['online']),
        isOn: _readBool(json['isOn'] ?? json['is_on'] ?? json['fire']),
        fireLevel: _readInt(json['fireLevel'] ?? json['fire_level'], 60),
        temp: _readDouble(json['temp'], 25),
        gas: _readDouble(json['gas'], 0),
        smoke: _readDouble(json['smoke'], 0),
        flow: _readDouble(json['flow'], 0),
        humanDetected:
            _readBool(json['humanDetected'] ?? json['human_detected']),
        vibration: _readBool(json['vibration']),
        locked: _readBool(json['locked']),
        valveStatus: (json['valveStatus'] ?? json['valve_status'] ?? 'closed')
            .toString(),
        lastHeartbeatAt: _readNullableString(
          json['lastHeartbeatAt'] ?? json['last_heartbeat_at'],
        ),
        firmwareVersion: _readNullableString(
          json['firmwareVersion'] ?? json['firmware_version'],
        ),
        ownerId: _readNullableString(
          json['ownerId'] ?? json['owner_id'] ?? json['ownerUid'] ?? json['owner_uid'],
        ),
        ownerDisplayName: _readNullableString(
          json['ownerDisplayName'] ?? json['owner_display_name'],
        ),
        sharedWith: _readStringList(json['sharedWith'] ?? json['shared_with']),
        sharedWithProfiles: _readProfileList(
          json['sharedWithProfiles'] ?? json['shared_with_profiles'],
        ),
      );
}

bool _readBool(dynamic value) {
  if (value is bool) {
    return value;
  }

  if (value is num) {
    return value != 0;
  }

  final text = value?.toString().trim().toLowerCase() ?? '';
  return text == 'true' || text == '1';
}

int _readInt(dynamic value, int fallback) {
  if (value is int) {
    return value;
  }

  if (value is num) {
    return value.toInt();
  }

  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

double _readDouble(dynamic value, double fallback) {
  if (value is double) {
    return value;
  }

  if (value is num) {
    return value.toDouble();
  }

  return double.tryParse(value?.toString() ?? '') ?? fallback;
}

String? _readNullableString(dynamic value) {
  final text = value?.toString().trim() ?? '';
  return text.isEmpty ? null : text;
}

String? _resolveLocationText(dynamic value) {
  if (value == null) {
    return null;
  }

  if (value is String) {
    final text = value.trim();
    return text.isEmpty ? null : text;
  }

  if (value is Map) {
    final map = Map<String, dynamic>.from(value);
    final address = _readNullableString(
      map['address'] ?? map['formattedAddress'] ?? map['formatted_address'],
    );
    if (address != null) {
      return address;
    }

    final name = _readNullableString(map['name'] ?? map['poiName'] ?? map['poi_name']);
    return name;
  }

  return value.toString();
}

List<String> _readStringList(dynamic value) {
  if (value is! List) {
    return const [];
  }

  return value
      .map((item) => item?.toString().trim() ?? '')
      .where((item) => item.isNotEmpty)
      .toList(growable: false);
}

List<SharedProfile> _readProfileList(dynamic value) {
  if (value is! List) {
    return const [];
  }

  return value
      .whereType<Map>()
      .map((item) => SharedProfile.fromJson(Map<String, dynamic>.from(item)))
      .toList(growable: false);
}
