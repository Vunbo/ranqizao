import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme.dart';
import '../../../models/merchant.dart';
import '../../../services/api_client.dart';
import '../../../services/merchant_service.dart';
import 'profile_subview_scaffold.dart';

class MerchantPanelView extends ConsumerStatefulWidget {
  const MerchantPanelView({
    super.key,
    required this.onBack,
    required this.onMessage,
  });

  final VoidCallback onBack;
  final void Function(String message, {required bool isError}) onMessage;

  @override
  ConsumerState<MerchantPanelView> createState() => _MerchantPanelViewState();
}

class _MerchantPanelViewState extends ConsumerState<MerchantPanelView> {
  bool _isLoading = false;
  MerchantPanel? _panel;

  MerchantProfileSummary? get _profile => _panel?.profile;
  MerchantApplicationSummary? get _approvedApplication =>
      _panel?.approvedApplication;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final panel = await ref.read(merchantServiceProvider).getPanel();
      if (!mounted) {
        return;
      }
      setState(() {
        _panel = panel;
      });
    } catch (error) {
      widget.onMessage(
        extractErrorMessage(error, fallback: '商户面板加载失败'),
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ProfileSubviewScaffold(
      title: '商户面板',
      subtitle: '查看当前商户信息与申请结果',
      onBack: widget.onBack,
      child: _isLoading
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
                  ProfileSurfaceCard(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _profile?.merchantName ?? '商户信息',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _profile == null
                                    ? '暂无商户档案'
                                    : '${_profile!.levelLabel} · ${_profile!.status == 'active' ? '已启用' : _profile!.status}',
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          constraints: const BoxConstraints(minWidth: 80),
                          height: 32,
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          decoration: BoxDecoration(
                            color: AppColors.primaryLight,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            _profile == null ? '未开通' : '已开通',
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
                  if (_profile != null)
                    ProfileSurfaceCard(
                      margin: const EdgeInsets.only(top: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '商户档案',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _InfoItem(label: '联系人', value: _profile!.contactName),
                          _InfoItem(
                              label: '联系电话', value: _profile!.contactPhone),
                          _InfoItem(label: '申请级别', value: _profile!.levelLabel),
                          _InfoItem(
                            label: '通过时间',
                            value: _profile!.approvedAt ?? '-',
                          ),
                        ],
                      ),
                    ),
                  if (_approvedApplication != null)
                    ProfileSurfaceCard(
                      margin: const EdgeInsets.only(top: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '申请详情',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _InfoItem(
                            label: '所在区域',
                            value: _approvedApplication!.region.isNotEmpty
                                ? _approvedApplication!.region
                                : '-',
                          ),
                          _InfoItem(
                            label: '联系地址',
                            value: _approvedApplication!.address.isNotEmpty
                                ? _approvedApplication!.address
                                : '-',
                          ),
                          _InfoItem(
                            label: '审核备注',
                            value: (_approvedApplication!.reviewComment ?? '')
                                    .isNotEmpty
                                ? _approvedApplication!.reviewComment!
                                : '-',
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

class _InfoItem extends StatelessWidget {
  const _InfoItem({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              height: 1.7,
              color: AppColors.slate700,
            ),
          ),
        ],
      ),
    );
  }
}
