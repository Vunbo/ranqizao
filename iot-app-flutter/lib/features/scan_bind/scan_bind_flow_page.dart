import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme.dart';
import '../../models/device.dart';
import '../../models/device_binding.dart';
import '../../providers/device_provider.dart';
import '../../services/api_client.dart';
import '../../services/device_binding_runtime_service.dart';
import '../../widgets/app_icon.dart';
import 'qr_scanner_page.dart';
import 'scan_bind_provider.dart';

Future<T?> showScanBindFlowDialog<T>(BuildContext context) {
  return showGeneralDialog<T>(
    context: context,
    barrierLabel: '添加设备',
    barrierDismissible: true,
    barrierColor: Colors.transparent,
    transitionDuration: const Duration(milliseconds: 220),
    pageBuilder: (_, __, ___) => const ScanBindFlowPage(asModal: true),
    transitionBuilder: (context, animation, secondaryAnimation, child) {
      final curve = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
      );
      return FadeTransition(
        opacity: curve,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 0.06),
            end: Offset.zero,
          ).animate(curve),
          child: child,
        ),
      );
    },
  );
}

class ScanBindFlowPage extends ConsumerStatefulWidget {
  const ScanBindFlowPage({
    super.key,
    this.asModal = false,
  });

  final bool asModal;
  @override
  ConsumerState<ScanBindFlowPage> createState() => _ScanBindFlowPageState();
}

class _ScanBindFlowPageState extends ConsumerState<ScanBindFlowPage>
    with SingleTickerProviderStateMixin {
  late final TextEditingController _deviceNameController;
  final TextEditingController _wifiSsidController = TextEditingController();
  final TextEditingController _wifiPasswordController = TextEditingController();

  late final AnimationController _motionController;
  ProviderSubscription<ScanBindState>? _noticeSubscription;

  @override
  void initState() {
    super.initState();
    _deviceNameController = TextEditingController(text: '智能安全灶');
    _motionController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat();
    _noticeSubscription = ref.listenManual<ScanBindState>(
      scanBindProvider,
      (previous, next) {
        final previousNoticeId = previous?.notice?.id;
        final nextNotice = next.notice;
        if (nextNotice == null ||
            nextNotice.id == previousNoticeId ||
            !mounted) {
          return;
        }

        final backgroundColor = switch (nextNotice.type) {
          ScanBindNoticeType.error => AppColors.danger,
          ScanBindNoticeType.info => AppColors.slate700,
        };

        _showSnackBar(nextNotice.message, backgroundColor);
      },
    );
  }

  @override
  void dispose() {
    _noticeSubscription?.close();
    _motionController.dispose();
    _deviceNameController.dispose();
    _wifiSsidController.dispose();
    _wifiPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(scanBindProvider);

    if (widget.asModal) {
      return Material(
        color: Colors.transparent,
        child: Stack(
          children: [
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => Navigator.of(context).pop(),
                child: Container(color: AppColors.maskBg),
              ),
            ),
            SafeArea(
              child: Align(
                alignment: Alignment.bottomCenter,
                child: AnimatedPadding(
                  duration: const Duration(milliseconds: 180),
                  curve: Curves.easeOut,
                  padding: EdgeInsets.fromLTRB(
                    20,
                    16,
                    20,
                    24 + MediaQuery.of(context).viewInsets.bottom,
                  ),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: _buildFlowCard(state),
                  ),
                ),
              ),
            ),
            if (state.permissionDialog.visible)
              _PermissionDialogOverlay(
                dialog: state.permissionDialog,
                onClose: () => ref
                    .read(scanBindProvider.notifier)
                    .closePermissionDialog(),
                onOpenSettings: () =>
                    ref.read(scanBindProvider.notifier).openPermissionSettings(),
              ),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: Stack(
        children: [
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                children: [
                  _buildHeader(context),
                  const SizedBox(height: 20),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: _buildFlowCard(state),
                  ),
                ],
              ),
            ),
          ),
          if (state.permissionDialog.visible)
            _PermissionDialogOverlay(
              dialog: state.permissionDialog,
              onClose: () =>
                  ref.read(scanBindProvider.notifier).closePermissionDialog(),
              onOpenSettings: () =>
                  ref.read(scanBindProvider.notifier).openPermissionSettings(),
            ),
        ],
      ),
    );
  }

  Widget _buildFlowCard(ScanBindState state) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: _buildStepContent(state),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      children: [
        GestureDetector(
          onTap: () => Navigator.of(context).pop(),
          child: Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(21),
              border: Border.all(color: AppColors.slate200),
            ),
            child: const Center(
              child: AppIcon(
                name: 'arrowLeft',
                size: 18,
                color: AppColors.slate600,
              ),
            ),
          ),
        ),
        const Expanded(
          child: Text(
            '添加设备',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        const SizedBox(width: 42),
      ],
    );
  }

  Widget _buildStepContent(ScanBindState state) {
    return switch (state.step) {
      ScanBindStep.scan => _buildScanStep(state),
      ScanBindStep.location => _buildLocationStep(state),
      ScanBindStep.wifi => _buildWifiStep(),
      ScanBindStep.configuring => _buildConfiguringStep(state),
      ScanBindStep.naming => _buildNamingStep(state),
      ScanBindStep.success => _buildSuccessStep(),
    };
  }

  Widget _buildScanStep(ScanBindState state) {
    return Column(
      children: [
        const _ModalHandle(),
        const _SectionTitle(
          title: '第一步：扫码识别',
          desc: '请扫描设备机身上的二维码进行识别',
          centered: true,
        ),
        const SizedBox(height: 28),
        _buildAnimatedScannerFrame(size: 192),
        const SizedBox(height: 22),
        _PrimaryActionButton(
          loading: state.isLoading,
          text: state.isLoading ? '识别中...' : '开启摄像头扫码',
          onTap: _handleScan,
        ),
        const SizedBox(height: 14),
        GestureDetector(
          onTap: () => Navigator.of(context).pop(),
          child: const Text(
            '取消',
            style: TextStyle(
              fontSize: 13,
              color: AppColors.slate400,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLocationStep(ScanBindState state) {
    return Column(
      children: [
        const _ModalHandle(),
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(40),
          ),
          child: const Center(
            child: AppIcon(
              name: 'map',
              size: 30,
              color: AppColors.info,
            ),
          ),
        ),
        const SizedBox(height: 18),
        const _SectionTitle(
          title: '第二步：位置授权',
          desc: '根据安全合规要求，绑定设备前需要先获取当前位置，用于判断设备安装环境。',
          centered: true,
        ),
        const SizedBox(height: 22),
        _PrimaryActionButton(
          loading: state.isLoading,
          text: state.isLoading ? '定位中...' : '开启定位并获取位置',
          onTap: () => ref.read(scanBindProvider.notifier).handleGetLocation(),
        ),
        const SizedBox(height: 14),
        GestureDetector(
          onTap: () => Navigator.of(context).pop(),
          child: const Text(
            '取消绑定',
            style: TextStyle(
              fontSize: 13,
              color: AppColors.slate400,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildWifiStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _ModalHandle(),
        const _SectionTitle(
          title: '第三步：一键配网',
          desc: '请输入当前环境下的 Wi-Fi 信息',
        ),
        const SizedBox(height: 18),
        _LabeledInput(
          label: 'Wi-Fi 名称 (SSID)',
          icon: 'wifi',
          controller: _wifiSsidController,
          hint: '请输入 Wi-Fi 名称',
        ),
        const SizedBox(height: 18),
        _LabeledInput(
          label: 'Wi-Fi 密码',
          icon: 'lock',
          controller: _wifiPasswordController,
          hint: '请输入 Wi-Fi 密码',
          obscureText: true,
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFFFFBEB),
            borderRadius: BorderRadius.circular(18),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: EdgeInsets.only(top: 2),
                child: AppIcon(
                  name: 'info',
                  size: 14,
                  color: AppColors.warning,
                ),
              ),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  '请确认手机已连接到当前 Wi-Fi，且设备处于待配网状态。建议优先使用 2.4GHz 网络。',
                  style: TextStyle(
                    fontSize: 11,
                    height: 1.6,
                    color: Color(0xFFB45309),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 22),
        _PrimaryActionButton(
          text: '开始一键配网',
          onTap: () => ref
              .read(scanBindProvider.notifier)
              .startConfig(_wifiSsidController.text),
        ),
      ],
    );
  }

  Widget _buildConfiguringStep(ScanBindState state) {
    return Column(
      children: [
        const _ModalHandle(),
        const SizedBox(height: 12),
        _ProgressRing(progress: state.configProgress),
        const SizedBox(height: 18),
        const _SectionTitle(
          title: '正在配网中...',
          desc: '正在将 Wi-Fi 信息下发给设备，请稍候',
          centered: true,
        ),
        const SizedBox(height: 18),
        AnimatedBuilder(
          animation: _motionController,
          builder: (context, child) {
            return Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _WaveBar(height: _waveHeight(0.0)),
                const SizedBox(width: 6),
                _WaveBar(height: _waveHeight(0.18)),
                const SizedBox(width: 6),
                _WaveBar(height: _waveHeight(0.36)),
              ],
            );
          },
        ),
      ],
    );
  }

  Widget _buildNamingStep(ScanBindState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _ModalHandle(),
        const _SectionTitle(
          title: '第四步：设备命名',
          desc: '配网成功，请为您的新设备设置名称',
        ),
        const SizedBox(height: 18),
        _LabeledInput(
          label: '设备名称',
          controller: _deviceNameController,
          hint: '例如：厨房主灶',
        ),
        const SizedBox(height: 22),
        _PrimaryActionButton(
          loading: state.isLoading,
          text: state.isLoading ? '绑定中...' : '完成绑定',
          onTap: () => _handleBind(ref.read(deviceProvider).devices),
        ),
      ],
    );
  }

  Widget _buildSuccessStep() {
    return Column(
      children: [
        const _ModalHandle(),
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5),
            borderRadius: BorderRadius.circular(40),
          ),
          child: const Center(
            child: AppIcon(
              name: 'check',
              size: 30,
              color: AppColors.success,
            ),
          ),
        ),
        const SizedBox(height: 18),
        const _SectionTitle(
          title: '绑定成功',
          desc: '您的设备已成功接入 AI 智能安全灶平台',
          centered: true,
        ),
        const SizedBox(height: 22),
        GestureDetector(
          onTap: _handleFinish,
          child: Container(
            width: double.infinity,
            constraints: const BoxConstraints(minHeight: 52),
            decoration: BoxDecoration(
              color: AppColors.slate900,
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Center(
              child: Text(
                '开始使用',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAnimatedScannerFrame({required double size}) {
    final travel = size - 50;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.slate100,
        border: Border.all(color: AppColors.slate50, width: 2),
        borderRadius: BorderRadius.circular(28),
      ),
      child: AnimatedBuilder(
        animation: _motionController,
        child: const Center(
          child: AppIcon(
            name: 'scan',
            size: 52,
            color: AppColors.slate300,
          ),
        ),
        builder: (context, child) {
          return Stack(
            children: [
              child!,
              Positioned(
                left: 0,
                right: 0,
                top: 24 + travel * _motionController.value,
                child: Container(
                  height: 2,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.45),
                        blurRadius: 12,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  double _waveHeight(double phase) {
    final normalized =
        (math.sin((_motionController.value + phase) * math.pi * 2) + 1) / 2;
    return 12 + normalized * 10;
  }

  void _showSnackBar(String message, Color backgroundColor) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: backgroundColor,
      ),
    );
  }

  Future<void> _handleScan() async {
    try {
      await ref
          .read(deviceBindingRuntimeServiceProvider)
          .ensureCameraPermission();
    } on DeviceBindingPermissionException catch (error) {
      ref.read(scanBindProvider.notifier).showPermissionDialog(error.type);
      return;
    } catch (error) {
      if (!mounted) {
        return;
      }
      _showSnackBar(
        extractErrorMessage(error, fallback: '摄像头权限检查失败'),
        AppColors.danger,
      );
      return;
    }

    if (!mounted) {
      return;
    }

    final qrCode = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => const DeviceQrScannerPage(),
      ),
    );

    if (!mounted) {
      return;
    }

    final normalizedQrCode = qrCode?.trim() ?? '';
    if (normalizedQrCode.isEmpty) {
      _showSnackBar('已取消扫码。', AppColors.slate700);
      return;
    }

    await ref
        .read(scanBindProvider.notifier)
        .handleScannedQrCode(normalizedQrCode);
  }

  Future<void> _handleBind(List<Device> existingDevices) async {
    await ref.read(scanBindProvider.notifier).bindDevice(
          deviceName: _deviceNameController.text,
          wifiSsid: _wifiSsidController.text,
          wifiPassword: _wifiPasswordController.text,
          existingDevices: existingDevices,
        );
  }

  void _handleFinish() {
    ref.read(scanBindProvider.notifier).resetFlow();
    Navigator.of(context).pop(true);
  }
}

class _ModalHandle extends StatelessWidget {
  const _ModalHandle();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 48,
      height: 6,
      margin: const EdgeInsets.only(bottom: 18),
      decoration: BoxDecoration(
        color: AppColors.slate200,
        borderRadius: BorderRadius.circular(6),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.title,
    required this.desc,
    this.centered = false,
  });

  final String title;
  final String desc;
  final bool centered;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment:
          centered ? CrossAxisAlignment.center : CrossAxisAlignment.start,
      children: [
        Text(
          title,
          textAlign: centered ? TextAlign.center : TextAlign.start,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          desc,
          textAlign: centered ? TextAlign.center : TextAlign.start,
          style: const TextStyle(
            fontSize: 13,
            height: 1.7,
            color: AppColors.textMuted,
          ),
        ),
      ],
    );
  }
}

class _LabeledInput extends StatelessWidget {
  const _LabeledInput({
    required this.label,
    required this.controller,
    required this.hint,
    this.icon,
    this.obscureText = false,
  });

  final String label;
  final TextEditingController controller;
  final String hint;
  final String? icon;
  final bool obscureText;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4),
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.slate700,
            ),
          ),
        ),
        const SizedBox(height: 6),
        Container(
          constraints: const BoxConstraints(minHeight: 52),
          padding: EdgeInsets.only(left: icon == null ? 14 : 42, right: 14),
          decoration: BoxDecoration(
            color: AppColors.slate50,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Row(
            children: [
              if (icon != null)
                Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: AppIcon(
                    name: icon!,
                    size: 16,
                    color: AppColors.slate400,
                  ),
                ),
              Expanded(
                child: TextField(
                  controller: controller,
                  obscureText: obscureText,
                  decoration: InputDecoration(
                    hintText: hint,
                    hintStyle: const TextStyle(
                      color: AppColors.slate400,
                      fontSize: 14,
                    ),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 16),
                    filled: false,
                  ),
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PrimaryActionButton extends StatelessWidget {
  const _PrimaryActionButton({
    required this.text,
    required this.onTap,
    this.loading = false,
  });

  final String text;
  final VoidCallback onTap;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: loading ? null : onTap,
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(minHeight: 52),
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.2),
              blurRadius: 28,
              offset: const Offset(0, 14),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (loading)
              const Padding(
                padding: EdgeInsets.only(right: 6),
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                ),
              )
            else
              const SizedBox.shrink(),
            Text(
              text,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WaveBar extends StatelessWidget {
  const _WaveBar({
    required this.height,
  });

  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 4,
      height: height,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(4),
      ),
    );
  }
}

class _ProgressRing extends StatelessWidget {
  const _ProgressRing({
    required this.progress,
  });

  final double progress;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 132,
      height: 132,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: const Size.square(132),
            painter: _ProgressRingPainter(progress: progress),
          ),
          Container(
            width: 108,
            height: 108,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const AppIcon(
                  name: 'wifi',
                  size: 24,
                  color: AppColors.primary,
                ),
                const SizedBox(height: 6),
                Text(
                  '${progress.round()}%',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressRingPainter extends CustomPainter {
  const _ProgressRingPainter({
    required this.progress,
  });

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    const strokeWidth = 8.0;
    final rect = Offset.zero & size;
    final center = rect.center;
    final radius = (size.width - strokeWidth) / 2;

    final backgroundPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..color = AppColors.slate100
      ..strokeCap = StrokeCap.round;

    final foregroundPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..shader = const SweepGradient(
        startAngle: -math.pi / 2,
        endAngle: math.pi * 1.5,
        colors: [
          AppColors.primary,
          Color(0xFFFDA55A),
        ],
      ).createShader(rect);

    canvas.drawCircle(center, radius, backgroundPaint);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      math.pi * 2 * (progress / 100).clamp(0.0, 1.0),
      false,
      foregroundPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _ProgressRingPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

class _PermissionDialogOverlay extends StatelessWidget {
  const _PermissionDialogOverlay({
    required this.dialog,
    required this.onClose,
    required this.onOpenSettings,
  });

  final ScanBindPermissionDialog dialog;
  final VoidCallback onClose;
  final VoidCallback onOpenSettings;

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: Container(
        color: AppColors.maskBg,
        padding: const EdgeInsets.all(24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 320),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.16),
                    blurRadius: 48,
                    offset: const Offset(0, 24),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    dialog.title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    dialog.message,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 13,
                      height: 1.7,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: onClose,
                          child: Container(
                            height: 46,
                            decoration: BoxDecoration(
                              color: AppColors.slate100,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Center(
                              child: Text(
                                '取消',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.slate600,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: GestureDetector(
                          onTap: onOpenSettings,
                          child: Container(
                            height: 46,
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Center(
                              child: Text(
                                '去设置',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
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
    );
  }
}

