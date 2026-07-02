class User {
  final String uid;
  final String shortUid;
  final String displayName;
  final String? phone;
  final String? email;
  final String? avatar;

  const User({
    required this.uid,
    required this.shortUid,
    required this.displayName,
    this.phone,
    this.email,
    this.avatar,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    final uid = (json['uid'] ?? json['id'] ?? '').toString();
    final shortUidValue =
        (json['shortUid'] ?? json['short_uid'] ?? '').toString().trim();
    final displayNameValue =
        (json['displayName'] ?? json['display_name'] ?? '').toString().trim();

    return User(
      uid: uid,
      shortUid: shortUidValue.isNotEmpty
          ? shortUidValue
          : (uid.length >= 8 ? uid.substring(0, 8) : uid),
      displayName: displayNameValue.isNotEmpty ? displayNameValue : '用户',
      phone: _readNullableString(
        json['phone'] ?? json['primaryPhone'] ?? json['primary_phone'],
      ),
      email: _readNullableString(
        json['email'] ?? json['primaryEmail'] ?? json['primary_email'],
      ),
      avatar: _readNullableString(
        json['avatar'] ?? json['photoURL'] ?? json['photo_url'],
      ),
    );
  }
}

String? _readNullableString(dynamic value) {
  final text = value?.toString().trim() ?? '';
  return text.isEmpty ? null : text;
}
