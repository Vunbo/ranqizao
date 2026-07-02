class MerchantProfileSummary {
  const MerchantProfileSummary({
    required this.id,
    required this.applicationId,
    required this.status,
    required this.levelCode,
    required this.levelLabel,
    required this.merchantName,
    required this.contactName,
    required this.contactPhone,
    this.approvedAt,
    this.updatedAt,
  });

  final String id;
  final String applicationId;
  final String status;
  final String levelCode;
  final String levelLabel;
  final String merchantName;
  final String contactName;
  final String contactPhone;
  final String? approvedAt;
  final String? updatedAt;

  factory MerchantProfileSummary.fromJson(Map<String, dynamic> json) {
    return MerchantProfileSummary(
      id: (json['id'] ?? '').toString(),
      applicationId:
          (json['applicationId'] ?? json['application_id'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      levelCode: (json['levelCode'] ?? json['level_code'] ?? '').toString(),
      levelLabel: (json['levelLabel'] ?? json['level_label'] ?? '').toString(),
      merchantName:
          (json['merchantName'] ?? json['merchant_name'] ?? '').toString(),
      contactName:
          (json['contactName'] ?? json['contact_name'] ?? '').toString(),
      contactPhone:
          (json['contactPhone'] ?? json['contact_phone'] ?? '').toString(),
      approvedAt:
          _readNullableString(json['approvedAt'] ?? json['approved_at']),
      updatedAt: _readNullableString(json['updatedAt'] ?? json['updated_at']),
    );
  }
}

class MerchantApplicationSummary {
  const MerchantApplicationSummary({
    required this.id,
    required this.status,
    required this.levelCode,
    required this.levelLabel,
    required this.merchantName,
    required this.contactName,
    required this.contactPhone,
    required this.region,
    required this.address,
    this.note,
    this.reviewComment,
    this.reviewedAt,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String status;
  final String levelCode;
  final String levelLabel;
  final String merchantName;
  final String contactName;
  final String contactPhone;
  final String region;
  final String address;
  final String? note;
  final String? reviewComment;
  final String? reviewedAt;
  final String? createdAt;
  final String? updatedAt;

  factory MerchantApplicationSummary.fromJson(Map<String, dynamic> json) {
    return MerchantApplicationSummary(
      id: (json['id'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      levelCode: (json['levelCode'] ?? json['level_code'] ?? '').toString(),
      levelLabel: (json['levelLabel'] ?? json['level_label'] ?? '').toString(),
      merchantName:
          (json['merchantName'] ?? json['merchant_name'] ?? '').toString(),
      contactName:
          (json['contactName'] ?? json['contact_name'] ?? '').toString(),
      contactPhone:
          (json['contactPhone'] ?? json['contact_phone'] ?? '').toString(),
      region: (json['region'] ?? '').toString(),
      address: (json['address'] ?? '').toString(),
      note: _readNullableString(json['note']),
      reviewComment:
          _readNullableString(json['reviewComment'] ?? json['review_comment']),
      reviewedAt:
          _readNullableString(json['reviewedAt'] ?? json['reviewed_at']),
      createdAt: _readNullableString(json['createdAt'] ?? json['created_at']),
      updatedAt: _readNullableString(json['updatedAt'] ?? json['updated_at']),
    );
  }
}

class MerchantSummary {
  const MerchantSummary({
    this.profile,
    this.latestApplication,
    required this.canApply,
    required this.canEnterPanel,
  });

  final MerchantProfileSummary? profile;
  final MerchantApplicationSummary? latestApplication;
  final bool canApply;
  final bool canEnterPanel;

  factory MerchantSummary.fromJson(Map<String, dynamic> json) {
    final profileMap = _readMap(json['profile']);
    final applicationMap =
        _readMap(json['latestApplication'] ?? json['latest_application']);

    return MerchantSummary(
      profile: profileMap.isEmpty
          ? null
          : MerchantProfileSummary.fromJson(profileMap),
      latestApplication: applicationMap.isEmpty
          ? null
          : MerchantApplicationSummary.fromJson(applicationMap),
      canApply: _readBool(json['canApply'] ?? json['can_apply']),
      canEnterPanel:
          _readBool(json['canEnterPanel'] ?? json['can_enter_panel']),
    );
  }
}

class MerchantPage {
  const MerchantPage({
    required this.id,
    required this.pageKey,
    required this.versionType,
    required this.title,
    required this.payload,
    this.publishedAt,
    this.updatedAt,
  });

  final String id;
  final String pageKey;
  final String versionType;
  final String title;
  final MerchantPagePayload payload;
  final String? publishedAt;
  final String? updatedAt;

  factory MerchantPage.fromJson(Map<String, dynamic> json) {
    final payloadMap = _readMap(json['payload']);

    return MerchantPage(
      id: (json['id'] ?? '').toString(),
      pageKey: (json['pageKey'] ?? json['page_key'] ?? '').toString(),
      versionType:
          (json['versionType'] ?? json['version_type'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      payload: MerchantPagePayload.fromJson(payloadMap),
      publishedAt:
          _readNullableString(json['publishedAt'] ?? json['published_at']),
      updatedAt: _readNullableString(json['updatedAt'] ?? json['updated_at']),
    );
  }
}

class MerchantPagePayload {
  const MerchantPagePayload({
    this.pageTitle = '',
    this.pageSubtitle = '',
    this.applyNotice = '',
    this.cards = const [],
    this.contact = const MerchantPageContact(),
  });

  final String pageTitle;
  final String pageSubtitle;
  final String applyNotice;
  final List<MerchantPageCard> cards;
  final MerchantPageContact contact;

  factory MerchantPagePayload.fromJson(Map<String, dynamic> json) {
    return MerchantPagePayload(
      pageTitle: (json['pageTitle'] ?? json['title'] ?? '').toString().trim(),
      pageSubtitle:
          (json['pageSubtitle'] ?? json['subtitle'] ?? '').toString().trim(),
      applyNotice: (json['applyNotice'] ?? '').toString().trim(),
      cards: _readCardList(json['cards']),
      contact: MerchantPageContact.fromJson(_readMap(json['contact'])),
    );
  }
}

class MerchantPageCard {
  const MerchantPageCard({
    required this.id,
    this.title = '',
    this.badge = '',
    this.items = const [],
    this.note = '',
  });

  final String id;
  final String title;
  final String badge;
  final List<String> items;
  final String note;

  factory MerchantPageCard.fromJson(Map<String, dynamic> json, int index) {
    return MerchantPageCard(
      id: (json['id'] ?? 'card-${index + 1}').toString(),
      title: (json['title'] ?? '').toString().trim(),
      badge: (json['badge'] ?? '').toString().trim(),
      items: _readStringList(json['items']),
      note: (json['note'] ?? '').toString().trim(),
    );
  }
}

class MerchantPageContact {
  const MerchantPageContact({
    this.title = '',
    this.phone = '',
    this.wechat = '',
    this.address = '',
    this.note = '',
  });

  final String title;
  final String phone;
  final String wechat;
  final String address;
  final String note;

  factory MerchantPageContact.fromJson(Map<String, dynamic> json) {
    return MerchantPageContact(
      title: (json['title'] ?? '').toString().trim(),
      phone: (json['phone'] ?? '').toString().trim(),
      wechat: (json['wechat'] ?? '').toString().trim(),
      address: (json['address'] ?? '').toString().trim(),
      note: (json['note'] ?? '').toString().trim(),
    );
  }
}

class MerchantPanel {
  const MerchantPanel({
    this.profile,
    this.approvedApplication,
  });

  final MerchantProfileSummary? profile;
  final MerchantApplicationSummary? approvedApplication;

  factory MerchantPanel.fromJson(Map<String, dynamic> json) {
    final profileMap = _readMap(json['profile']);
    final applicationMap =
        _readMap(json['approvedApplication'] ?? json['approved_application']);

    return MerchantPanel(
      profile: profileMap.isEmpty
          ? null
          : MerchantProfileSummary.fromJson(profileMap),
      approvedApplication: applicationMap.isEmpty
          ? null
          : MerchantApplicationSummary.fromJson(applicationMap),
    );
  }
}

Map<String, dynamic> _readMap(dynamic value) {
  if (value is Map<String, dynamic>) {
    return value;
  }

  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }

  return const {};
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

String? _readNullableString(dynamic value) {
  final text = value?.toString().trim() ?? '';
  return text.isEmpty ? null : text;
}

List<MerchantPageCard> _readCardList(dynamic value) {
  if (value is! List) {
    return const [];
  }

  final cards = <MerchantPageCard>[];
  for (var index = 0; index < value.length; index += 1) {
    final item = value[index];
    if (item is Map<String, dynamic>) {
      cards.add(MerchantPageCard.fromJson(item, index));
      continue;
    }
    if (item is Map) {
      cards.add(MerchantPageCard.fromJson(
        item.map((key, nested) => MapEntry(key.toString(), nested)),
        index,
      ));
    }
  }
  return cards.toList(growable: false);
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
