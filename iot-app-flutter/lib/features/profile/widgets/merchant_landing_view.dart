import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme.dart';
import '../../../models/merchant.dart';
import '../../../services/api_client.dart';
import '../../../services/merchant_service.dart';
import '../../../widgets/app_icon.dart';
import 'profile_subview_scaffold.dart';

class MerchantLandingView extends ConsumerStatefulWidget {
  const MerchantLandingView({
    super.key,
    required this.onBack,
    required this.onMessage,
  });

  final VoidCallback onBack;
  final void Function(String message, {required bool isError}) onMessage;

  @override
  ConsumerState<MerchantLandingView> createState() =>
      _MerchantLandingViewState();
}

class _MerchantLandingViewState extends ConsumerState<MerchantLandingView> {
  static const List<_MerchantLevelOption> _levelOptions = [
    _MerchantLevelOption('operations_center', '运营中心'),
    _MerchantLevelOption('district_agent', '区代理'),
  ];

  static const Map<String, String> _applicationStatusLabels = {
    'pending': '审核中',
    'approved': '已通过',
    'rejected': '已驳回',
  };

  static const List<String> _internalContentPatterns = [
    '运维中台',
    '请在运维中台',
  ];

  final TextEditingController _merchantNameController = TextEditingController();
  final TextEditingController _contactNameController = TextEditingController();
  final TextEditingController _contactPhoneController = TextEditingController();
  final TextEditingController _regionController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _noteController = TextEditingController();

  bool _isLoading = false;
  bool _isRefreshing = false;
  bool _isSubmitting = false;
  bool _isContactOpen = false;
  bool _isApplyOpen = false;
  String _levelCode = _levelOptions.first.value;
  MerchantPage? _page;
  MerchantSummary? _summary;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _merchantNameController.dispose();
    _contactNameController.dispose();
    _contactPhoneController.dispose();
    _regionController.dispose();
    _addressController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  MerchantApplicationSummary? get _latestApplication =>
      _summary?.latestApplication;
  MerchantProfileSummary? get _merchantProfile => _summary?.profile;

  List<MerchantPageCard> get _cards {
    final cards = _page?.payload.cards ?? const <MerchantPageCard>[];
    return cards.where((card) {
      return card.title.isNotEmpty ||
          card.badge.isNotEmpty ||
          card.note.isNotEmpty ||
          card.items.isNotEmpty;
    }).toList(growable: false);
  }

  String get _pageTitle => _sanitizePublicText(_page?.payload.pageTitle);
  String get _pageSubtitle => _sanitizePublicText(_page?.payload.pageSubtitle);
  String get _applyNotice => _sanitizePublicText(_page?.payload.applyNotice);

  MerchantPageContact get _contact {
    final contact = _page?.payload.contact;
    if (contact == null) {
      return const MerchantPageContact();
    }

    return MerchantPageContact(
      title: _sanitizePublicText(contact.title),
      phone: _sanitizePublicText(contact.phone),
      wechat: _sanitizePublicText(contact.wechat),
      address: _sanitizePublicText(contact.address),
      note: _sanitizePublicText(contact.note),
    );
  }

  List<_MerchantContactEntry> get _contactEntries {
    final contact = _contact;
    return [
      _MerchantContactEntry('联系电话', contact.phone),
      _MerchantContactEntry('微信', contact.wechat),
      _MerchantContactEntry('联系地址', contact.address),
      _MerchantContactEntry('备注', contact.note),
    ].where((entry) => entry.value.isNotEmpty).toList(growable: false);
  }

  bool get _hasHeroContent {
    return _pageTitle.isNotEmpty ||
        _pageSubtitle.isNotEmpty ||
        _applyNotice.isNotEmpty;
  }

  bool get _canApply => _summary?.canApply ?? false;

  String get _applyButtonText {
    if (_merchantProfile != null) {
      return '已入驻';
    }
    if (_latestApplication?.status == 'pending') {
      return '审核中';
    }
    if (_latestApplication?.status == 'rejected') {
      return '重新申请';
    }
    return '申请入驻';
  }

  bool get _applyDisabled {
    if (_isSubmitting) {
      return true;
    }
    return !_canApply;
  }

  String get _applicationStatusText {
    if (_latestApplication == null) {
      return _merchantProfile != null ? '已开通商户面板' : '暂未提交申请';
    }
    return _applicationStatusLabels[_latestApplication!.status] ??
        _latestApplication!.status;
  }

  String get _applicationStatusDesc {
    if (_merchantProfile != null) {
      return '商户面板已开通，可在“我的 > 更多”中进入。';
    }
    if (_latestApplication == null) {
      return '提交入驻申请后，可在这里查看审核状态。';
    }
    final reviewComment =
        _sanitizePublicText(_latestApplication?.reviewComment);
    if (reviewComment.isNotEmpty) {
      return reviewComment;
    }
    if (_applyNotice.isNotEmpty) {
      return _applyNotice;
    }
    return '请等待平台审核。';
  }

  String _sanitizePublicText(String? value) {
    final normalized = value?.trim() ?? '';
    if (normalized.isEmpty) {
      return '';
    }
    for (final pattern in _internalContentPatterns) {
      if (normalized.contains(pattern)) {
        return '';
      }
    }
    return normalized;
  }

  void _syncFormFromExisting() {
    final application = _latestApplication;
    final profile = _merchantProfile;

    _levelCode = application?.levelCode.isNotEmpty == true
        ? application!.levelCode
        : profile?.levelCode.isNotEmpty == true
            ? profile!.levelCode
            : _levelOptions.first.value;
    _merchantNameController.text =
        application?.merchantName ?? profile?.merchantName ?? '';
    _contactNameController.text =
        application?.contactName ?? profile?.contactName ?? '';
    _contactPhoneController.text =
        application?.contactPhone ?? profile?.contactPhone ?? '';
    _regionController.text = application?.region ?? '';
    _addressController.text = application?.address ?? '';
    _noteController.text = application?.note ?? '';
  }

  Future<void> _load({
    bool silent = false,
    bool notifyOnError = true,
  }) async {
    if (_isLoading || _isRefreshing) {
      return;
    }

    setState(() {
      if (silent) {
        _isRefreshing = true;
      } else {
        _isLoading = true;
      }
    });

    try {
      final service = ref.read(merchantServiceProvider);
      final results = await Future.wait<dynamic>([
        service.getPage(),
        service.getSummary(),
      ]);

      if (!mounted) {
        return;
      }

      setState(() {
        _page = results[0] as MerchantPage?;
        _summary = results[1] as MerchantSummary;
        _syncFormFromExisting();
      });
    } catch (error) {
      if (notifyOnError) {
        widget.onMessage(
          extractErrorMessage(error, fallback: '推广/入驻页面加载失败'),
          isError: true,
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isRefreshing = false;
        });
      }
    }
  }

  void _openContact() {
    setState(() {
      _isContactOpen = true;
    });
    _load(silent: true, notifyOnError: false);
  }

  void _closeContact() {
    setState(() {
      _isContactOpen = false;
    });
  }

  void _openApply() {
    if (_applyDisabled && _latestApplication?.status != 'rejected') {
      return;
    }
    _syncFormFromExisting();
    setState(() {
      _isApplyOpen = true;
    });
  }

  void _closeApply({bool force = false}) {
    if (_isSubmitting && !force) {
      return;
    }
    setState(() {
      _isApplyOpen = false;
    });
  }

  Future<void> _submit() async {
    final merchantName = _merchantNameController.text.trim();
    final contactName = _contactNameController.text.trim();
    final contactPhone = _contactPhoneController.text.trim();
    final region = _regionController.text.trim();
    final address = _addressController.text.trim();
    final note = _noteController.text.trim();

    if (merchantName.isEmpty ||
        contactName.isEmpty ||
        contactPhone.isEmpty ||
        region.isEmpty ||
        address.isEmpty) {
      widget.onMessage('请完整填写申请信息', isError: true);
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final application =
          await ref.read(merchantServiceProvider).submitApplication(
                levelCode: _levelCode,
                merchantName: merchantName,
                contactName: contactName,
                contactPhone: contactPhone,
                region: region,
                address: address,
                note: note,
              );

      if (!mounted) {
        return;
      }

      setState(() {
        _summary = MerchantSummary(
          profile: _merchantProfile,
          latestApplication: application,
          canApply: false,
          canEnterPanel: false,
        );
        _isApplyOpen = false;
      });

      widget.onMessage('入驻申请已提交，请等待审核', isError: false);
    } catch (error) {
      widget.onMessage(
        extractErrorMessage(error, fallback: '入驻申请提交失败'),
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final content = _isLoading
        ? const Center(
            child: SizedBox(
              width: 30,
              height: 30,
              child: CircularProgressIndicator(
                strokeWidth: 3,
                color: AppColors.primary,
              ),
            ),
          )
        : SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_hasHeroContent)
                  ProfileSurfaceCard(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _pageTitle,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        if (_pageSubtitle.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Text(
                            _pageSubtitle,
                            style: const TextStyle(
                              fontSize: 13,
                              height: 1.7,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ],
                        if (_applyNotice.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Text(
                            _applyNotice,
                            style: const TextStyle(
                              fontSize: 13,
                              height: 1.7,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ProfileSurfaceCard(
                  margin: EdgeInsets.only(top: _hasHeroContent ? 16 : 0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '当前状态',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              _applicationStatusDesc,
                              style: const TextStyle(
                                fontSize: 13,
                                height: 1.7,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        constraints: const BoxConstraints(minWidth: 76),
                        height: 32,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          _applicationStatusText,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                ..._cards.map(
                  (card) => ProfileSurfaceCard(
                    margin: const EdgeInsets.only(top: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (card.title.isNotEmpty || card.badge.isNotEmpty)
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  card.title,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                              if (card.badge.isNotEmpty)
                                Container(
                                  constraints:
                                      const BoxConstraints(minWidth: 76),
                                  height: 32,
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12),
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryLight,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    card.badge,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        if (card.items.isNotEmpty) ...[
                          const SizedBox(height: 14),
                          ...card.items.map(
                            (item) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    margin: const EdgeInsets.only(
                                        top: 8, right: 10),
                                    decoration: const BoxDecoration(
                                      color: AppColors.primary,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  Expanded(
                                    child: Text(
                                      item,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        height: 1.7,
                                        color: AppColors.slate600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                        if (card.note.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(
                              card.note,
                              style: const TextStyle(
                                fontSize: 13,
                                height: 1.7,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                ProfileSurfaceCard(
                  margin: const EdgeInsets.only(top: 16, bottom: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '快捷操作',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 14),
                      _LandingActionButton(
                        label: '联系我们',
                        icon: const AppIcon(
                          name: 'phone',
                          size: 18,
                          color: AppColors.success,
                        ),
                        backgroundColor: AppColors.slate50,
                        textColor: AppColors.textPrimary,
                        onTap: _openContact,
                      ),
                      const SizedBox(height: 12),
                      _LandingActionButton(
                        label: _applyButtonText,
                        icon: AppIcon(
                          name: 'plus',
                          size: 18,
                          color: _applyDisabled
                              ? AppColors.slate300
                              : Colors.white,
                        ),
                        backgroundColor: _applyDisabled
                            ? AppColors.slate200
                            : AppColors.primary,
                        textColor: _applyDisabled
                            ? AppColors.textSecondary
                            : Colors.white,
                        onTap: _openApply,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );

    return ProfileSubviewScaffold(
      title: '推广 / 入驻',
      subtitle: '合作方案与商户入驻申请',
      onBack: widget.onBack,
      trailing: GestureDetector(
        onTap: (_isLoading || _isRefreshing) ? null : () => _load(silent: true),
        child: Container(
          height: 38,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 24,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppIcon(
                name: 'loader',
                size: 14,
                color: AppColors.textMuted,
                animated: _isRefreshing,
              ),
              const SizedBox(width: 6),
              Text(
                _isRefreshing ? '刷新中' : '刷新内容',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
      child: Stack(
        children: [
          content,
          if (_isContactOpen)
            ProfileModalMask(
              onDismiss: _closeContact,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 340),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(28),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_contact.title.isNotEmpty)
                        Text(
                          _contact.title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ..._contactEntries.map(
                        (entry) => Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                entry.label,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.slate700,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                entry.value,
                                style: const TextStyle(
                                  fontSize: 13,
                                  height: 1.7,
                                  color: AppColors.slate600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 22),
                      Row(
                        children: [
                          Expanded(
                            child: ProfileActionButton(
                              label: '关闭',
                              backgroundColor: AppColors.primary,
                              textColor: Colors.white,
                              onTap: _closeContact,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          if (_isApplyOpen)
            ProfileModalMask(
              onDismiss: () => _closeApply(),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: 360,
                  maxHeight: MediaQuery.of(context).size.height * 0.8,
                ),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(28),
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '申请入驻',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          '请完善商户信息，提交后由平台审核。',
                          style: TextStyle(
                            fontSize: 12,
                            height: 1.7,
                            color: AppColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          '入驻级别',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.slate700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: _levelOptions
                              .map(
                                (option) => Expanded(
                                  child: Padding(
                                    padding: EdgeInsets.only(
                                      right: option == _levelOptions.first
                                          ? 10
                                          : 0,
                                    ),
                                    child: GestureDetector(
                                      onTap: () {
                                        setState(() {
                                          _levelCode = option.value;
                                        });
                                      },
                                      child: Container(
                                        height: 42,
                                        decoration: BoxDecoration(
                                          color: _levelCode == option.value
                                              ? AppColors.primaryLight
                                              : AppColors.slate50,
                                          borderRadius:
                                              BorderRadius.circular(16),
                                        ),
                                        alignment: Alignment.center,
                                        child: Text(
                                          option.label,
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w700,
                                            color: _levelCode == option.value
                                                ? AppColors.primary
                                                : AppColors.textMuted,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              )
                              .toList(growable: false),
                        ),
                        const SizedBox(height: 16),
                        _FormField(
                          label: '商户名称',
                          controller: _merchantNameController,
                          hintText: '请输入商户名称',
                        ),
                        _FormField(
                          label: '联系人',
                          controller: _contactNameController,
                          hintText: '请输入联系人',
                        ),
                        _FormField(
                          label: '联系电话',
                          controller: _contactPhoneController,
                          hintText: '请输入联系电话',
                        ),
                        _FormField(
                          label: '所在区域',
                          controller: _regionController,
                          hintText: '如：上海市闵行区',
                        ),
                        _FormField(
                          label: '联系地址',
                          controller: _addressController,
                          hintText: '请输入联系地址',
                        ),
                        _FormField(
                          label: '补充说明',
                          controller: _noteController,
                          hintText: '选填，可填写合作说明',
                          maxLines: 5,
                        ),
                        const SizedBox(height: 22),
                        Row(
                          children: [
                            Expanded(
                              child: ProfileActionButton(
                                label: '取消',
                                backgroundColor: AppColors.slate50,
                                textColor: AppColors.slate700,
                                onTap:
                                    _isSubmitting ? null : () => _closeApply(),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ProfileActionButton(
                                label: _isSubmitting ? '提交中...' : '提交申请',
                                backgroundColor: AppColors.primary,
                                textColor: Colors.white,
                                onTap: _isSubmitting ? null : _submit,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _LandingActionButton extends StatelessWidget {
  const _LandingActionButton({
    required this.label,
    required this.icon,
    required this.backgroundColor,
    required this.textColor,
    required this.onTap,
  });

  final String label;
  final Widget icon;
  final Color backgroundColor;
  final Color textColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(18),
        ),
        alignment: Alignment.center,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            icon,
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: textColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FormField extends StatelessWidget {
  const _FormField({
    required this.label,
    required this.controller,
    required this.hintText,
    this.maxLines = 1,
  });

  final String label;
  final TextEditingController controller;
  final String hintText;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    final isTextarea = maxLines > 1;

    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.slate700,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: AppColors.slate50,
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: TextField(
              controller: controller,
              maxLines: maxLines,
              minLines: isTextarea ? maxLines : 1,
              decoration: InputDecoration(
                hintText: hintText,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MerchantLevelOption {
  const _MerchantLevelOption(this.value, this.label);

  final String value;
  final String label;
}

class _MerchantContactEntry {
  const _MerchantContactEntry(this.label, this.value);

  final String label;
  final String value;
}
