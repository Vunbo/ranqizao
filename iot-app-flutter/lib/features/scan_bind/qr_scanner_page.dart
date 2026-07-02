import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/theme.dart';
import '../../widgets/app_icon.dart';

class DeviceQrScannerPage extends StatefulWidget {
  const DeviceQrScannerPage({super.key});

  @override
  State<DeviceQrScannerPage> createState() => _DeviceQrScannerPageState();
}

class _DeviceQrScannerPageState extends State<DeviceQrScannerPage>
    with SingleTickerProviderStateMixin {
  final MobileScannerController _controller = MobileScannerController(
    facing: CameraFacing.back,
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: const [BarcodeFormat.qrCode],
  );

  StreamSubscription<BarcodeCapture>? _subscription;
  late final AnimationController _motionController;
  bool _completed = false;

  @override
  void initState() {
    super.initState();
    _subscription = _controller.barcodes.listen(_handleCapture);
    _motionController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat();
  }

  @override
  void dispose() {
    _motionController.dispose();
    unawaited(_subscription?.cancel());
    unawaited(_controller.dispose());
    super.dispose();
  }

  Future<void> _handleCapture(BarcodeCapture capture) async {
    if (_completed) {
      return;
    }

    for (final barcode in capture.barcodes) {
      final rawValue = barcode.rawValue?.trim() ?? '';
      if (rawValue.isEmpty) {
        continue;
      }

      _completed = true;
      await _controller.stop();
      if (mounted) {
        Navigator.of(context).pop(rawValue);
      }
      return;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(
            controller: _controller,
            errorBuilder: (context, error) {
              return ColoredBox(
                color: Colors.black,
                child: Center(
                  child: Text(
                    error.errorDetails?.message ?? '摄像头启动失败',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                  ),
                ),
              );
            },
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
              child: Column(
                children: [
                  Row(
                    children: [
                      GestureDetector(
                        onTap: () => Navigator.of(context).pop(),
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Center(
                            child: AppIcon(
                              name: 'arrowLeft',
                              size: 18,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                      const Expanded(
                        child: Text(
                          '扫码识别设备',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 40),
                    ],
                  ),
                  const Spacer(),
                  _buildScannerFrame(),
                  const SizedBox(height: 22),
                  const Text(
                    '请将设备机身上的二维码放入框内',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                    ),
                  ),
                  const Spacer(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScannerFrame() {
    const size = 240.0;
    const topInset = 24.0;
    const bottomInset = 28.0;
    const travel = size - topInset - bottomInset;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.9),
          width: 2,
        ),
        borderRadius: BorderRadius.circular(28),
      ),
      child: AnimatedBuilder(
        animation: _motionController,
        builder: (context, child) {
          return Stack(
            children: [
              Positioned(
                left: 18,
                right: 18,
                top: topInset + travel * _motionController.value,
                child: Container(
                  height: 3,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(4),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.45),
                        blurRadius: 14,
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
}
