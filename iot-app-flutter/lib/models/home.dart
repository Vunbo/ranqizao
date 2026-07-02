class HomeProfile {
  final String uid;
  final String displayName;

  const HomeProfile({
    required this.uid,
    required this.displayName,
  });

  factory HomeProfile.fromJson(Map<String, dynamic> json) {
    final uid = (json['uid'] ?? json['id'] ?? '').toString();
    final displayName =
        (json['displayName'] ?? json['display_name'] ?? uid).toString();

    return HomeProfile(
      uid: uid,
      displayName: displayName,
    );
  }
}

class Home {
  final String id;
  final String name;
  final String? ownerId;
  final String? ownerDisplayName;
  final List<String> members;
  final List<String> deviceIds;
  final List<HomeProfile> memberProfiles;

  const Home({
    required this.id,
    required this.name,
    this.ownerId,
    this.ownerDisplayName,
    this.members = const [],
    this.deviceIds = const [],
    this.memberProfiles = const [],
  });

  factory Home.fromJson(Map<String, dynamic> json) {
    return Home(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      ownerId: _readNullableString(
        json['ownerId'] ?? json['owner_id'] ?? json['ownerUid'] ?? json['owner_uid'],
      ),
      ownerDisplayName: _readNullableString(
        json['ownerDisplayName'] ?? json['owner_display_name'],
      ),
      members: _readStringList(json['members']),
      deviceIds: _readStringList(json['deviceIds'] ?? json['device_ids']),
      memberProfiles: _readProfileList(
        json['memberProfiles'] ?? json['member_profiles'],
      ),
    );
  }
}

String? _readNullableString(dynamic value) {
  final text = value?.toString().trim() ?? '';
  return text.isEmpty ? null : text;
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

List<HomeProfile> _readProfileList(dynamic value) {
  if (value is! List) {
    return const [];
  }

  return value
      .whereType<Map>()
      .map((item) => HomeProfile.fromJson(Map<String, dynamic>.from(item)))
      .toList(growable: false);
}
