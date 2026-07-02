import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/device.dart';
import '../../models/device_binding.dart';
import '../../providers/device_provider.dart';
import '../../services/api_client.dart';
import '../../services/device_binding_runtime_service.dart';
import '../../services/device_service.dart';

enum ScanBindStep {
  scan,
  location,
  wifi,
  configuring,
  naming,
  success,
}

enum ScanBindingMode {
  inventory,
  mock,
}

enum ScanBindNoticeType {
  info,
  error,
}

class ScanBindNotice {
  const ScanBindNotice({
    required this.id,
    required this.message,
    required this.type,
  });

  final int id;
  final String message;
  final ScanBindNoticeType type;
}

class ScanBindPermissionDialog {
  const ScanBindPermissionDialog({
    required this.visible,
    required this.type,
    required this.title,
    required this.message,
  });

  const ScanBindPermissionDialog.empty()
      : visible = false,
        type = null,
        title = '',
        message = '';

  factory ScanBindPermissionDialog.fromType(DeviceBindingPermissionType type) {
    if (type == DeviceBindingPermissionType.camera) {
      return const ScanBindPermissionDialog(
        visible: true,
        type: DeviceBindingPermissionType.camera,
        title: '需要开启摄像头权限',
        message: '绑定设备第一步需要调用摄像头扫码，请在系统设置中允许当前应用使用摄像头。',
      );
    }

    return const ScanBindPermissionDialog(
      visible: true,
      type: DeviceBindingPermissionType.location,
      title: '需要开启定位权限',
      message: '绑定设备第二步需要获取当前位置，请在系统设置中允许当前应用使用定位权限。',
    );
  }

  final bool visible;
  final DeviceBindingPermissionType? type;
  final String title;
  final String message;
}

class ScanBindState {
  const ScanBindState({
    this.step = ScanBindStep.scan,
    this.isLoading = false,
    this.configProgress = 0,
    this.location,
    this.permissionDialog = const ScanBindPermissionDialog.empty(),
    this.notice,
    this.scannedQrCode = '',
    this.bindingMode = ScanBindingMode.inventory,
  });

  static const Object _unset = Object();

  final ScanBindStep step;
  final bool isLoading;
  final double configProgress;
  final BindingLocationPayload? location;
  final ScanBindPermissionDialog permissionDialog;
  final ScanBindNotice? notice;
  final String scannedQrCode;
  final ScanBindingMode bindingMode;

  ScanBindState copyWith({
    ScanBindStep? step,
    bool? isLoading,
    double? configProgress,
    Object? location = _unset,
    ScanBindPermissionDialog? permissionDialog,
    Object? notice = _unset,
    String? scannedQrCode,
    ScanBindingMode? bindingMode,
  }) {
    return ScanBindState(
      step: step ?? this.step,
      isLoading: isLoading ?? this.isLoading,
      configProgress: configProgress ?? this.configProgress,
      location: identical(location, _unset)
          ? this.location
          : location as BindingLocationPayload?,
      permissionDialog: permissionDialog ?? this.permissionDialog,
      notice:
          identical(notice, _unset) ? this.notice : notice as ScanBindNotice?,
      scannedQrCode: scannedQrCode ?? this.scannedQrCode,
      bindingMode: bindingMode ?? this.bindingMode,
    );
  }
}

class ScanBindNotifier extends StateNotifier<ScanBindState> {
  ScanBindNotifier(
    this._ref,
    this._deviceService,
    this._runtimeService,
  ) : super(const ScanBindState());

  final Ref _ref;
  final DeviceService _deviceService;
  final DeviceBindingRuntimeService _runtimeService;

  Timer? _configTimer;
  Timer? _configTransitionTimer;
  int _noticeId = 0;

  void showPermissionDialog(DeviceBindingPermissionType type) {
    state = state.copyWith(
      permissionDialog: ScanBindPermissionDialog.fromType(type),
    );
  }

  void closePermissionDialog() {
    state = state.copyWith(
      permissionDialog: const ScanBindPermissionDialog.empty(),
    );
  }

  Future<void> openPermissionSettings() async {
    try {
      await _runtimeService.openSystemSettings();
      _emitNotice(
        '已打开系统权限设置，请完成授权后重试。',
        ScanBindNoticeType.info,
      );
    } catch (error) {
      _emitNotice(
        extractErrorMessage(error, fallback: '打开系统权限设置失败'),
        ScanBindNoticeType.error,
      );
    } finally {
      closePermissionDialog();
    }
  }

  Future<void> handleScannedQrCode(String qrCode) async {
    if (state.isLoading) {
      return;
    }

    state = state.copyWith(
      isLoading: true,
      permissionDialog: const ScanBindPermissionDialog.empty(),
    );

    try {
      final resolution = await _resolveScanBindingMode(qrCode.trim());
      state = state.copyWith(
        isLoading: false,
        scannedQrCode: qrCode.trim(),
        bindingMode: resolution.mode,
        step: ScanBindStep.location,
      );
      if (resolution.notice.isNotEmpty) {
        _emitNotice(resolution.notice, ScanBindNoticeType.info);
      }
    } catch (error) {
      state = state.copyWith(isLoading: false);
      _emitNotice(
        extractErrorMessage(error, fallback: '扫码识别失败'),
        ScanBindNoticeType.error,
      );
    }
  }

  Future<void> handleGetLocation() async {
    if (state.isLoading) {
      return;
    }

    state = state.copyWith(isLoading: true);

    try {
      final location = await _runtimeService.requestCurrentLocation();
      state = state.copyWith(
        isLoading: false,
        location: location,
        step: ScanBindStep.wifi,
      );
    } on DeviceBindingPermissionException catch (error) {
      state = state.copyWith(isLoading: false);
      showPermissionDialog(error.type);
    } catch (error) {
      state = state.copyWith(isLoading: false);
      _emitNotice(
        extractErrorMessage(error, fallback: '定位获取失败，请检查定位权限'),
        ScanBindNoticeType.error,
      );
    }
  }

  void startConfig(String wifiSsid) {
    if (_normalizeText(wifiSsid).isEmpty) {
      _emitNotice('请输入 Wi-Fi 名称。', ScanBindNoticeType.error);
      return;
    }

    _clearTimers();
    state = state.copyWith(
      step: ScanBindStep.configuring,
      configProgress: 0,
    );

    _configTimer = Timer.periodic(const Duration(milliseconds: 400), (timer) {
      final nextProgress = (state.configProgress + 8 + (timer.tick % 4) * 2)
          .clamp(0, 100)
          .toDouble();

      state = state.copyWith(configProgress: nextProgress);

      if (nextProgress >= 100) {
        _configTimer?.cancel();
        _configTimer = null;
        _configTransitionTimer = Timer(const Duration(milliseconds: 500), () {
          state = state.copyWith(step: ScanBindStep.naming);
        });
      }
    });
  }

  Future<void> bindDevice({
    required String deviceName,
    required String wifiSsid,
    required String wifiPassword,
    required List<Device> existingDevices,
  }) async {
    if (state.isLoading) {
      return;
    }

    final normalizedName = _normalizeText(deviceName);
    if (normalizedName.isEmpty) {
      _emitNotice('请输入设备名称。', ScanBindNoticeType.error);
      return;
    }

    if (_hasDuplicateName(existingDevices, normalizedName)) {
      _emitNotice('设备名称已存在，请修改后重试。', ScanBindNoticeType.error);
      return;
    }

    if (state.scannedQrCode.isEmpty) {
      _emitNotice('缺少扫码识别结果，请重新扫码。', ScanBindNoticeType.error);
      return;
    }

    state = state.copyWith(isLoading: true);

    try {
      if (state.bindingMode == ScanBindingMode.mock) {
        await _deviceService.create(
          name: normalizedName,
          location: state.location?.toJson(),
        );
      } else {
        await _deviceService.bindScanned(
          qrCode: state.scannedQrCode,
          name: normalizedName,
          location: state.location?.toJson(),
          wifiSsid: _normalizeText(wifiSsid),
          wifiPassword: wifiPassword,
        );
      }

      await _ref.read(deviceProvider.notifier).loadDevices();

      state = state.copyWith(
        isLoading: false,
        step: ScanBindStep.success,
      );
    } catch (error) {
      state = state.copyWith(isLoading: false);
      _emitNotice(
        extractErrorMessage(error, fallback: '设备绑定失败'),
        ScanBindNoticeType.error,
      );
    }
  }

  void resetFlow() {
    _clearTimers();
    state = const ScanBindState();
  }

  void _emitNotice(String message, ScanBindNoticeType type) {
    state = state.copyWith(
      notice: ScanBindNotice(
        id: ++_noticeId,
        message: message,
        type: type,
      ),
    );
  }

  Future<_ScanBindingResolution> _resolveScanBindingMode(String qrCode) async {
    try {
      final scanStatus = await _deviceService.scanBindable(qrCode);
      final bindStatus =
          (scanStatus['bindStatus'] ?? scanStatus['bind_status'] ?? '')
              .toString();

      if (bindStatus == 'already_bound_to_current_user') {
        throw Exception('该设备已绑定到当前账号');
      }

      if (bindStatus == 'already_bound') {
        throw Exception('该设备已被其他账号绑定');
      }

      return const _ScanBindingResolution(
        mode: ScanBindingMode.inventory,
        notice: '',
      );
    } catch (error) {
      final message = extractErrorMessage(error, fallback: '扫码识别失败');
      if (!_canFallbackToMockScan(message)) {
        throw Exception(message);
      }

      return const _ScanBindingResolution(
        mode: ScanBindingMode.mock,
        notice: '当前二维码未录入设备库，按模拟扫码流程继续。',
      );
    }
  }

  bool _hasDuplicateName(List<Device> devices, String nextName) {
    final normalized = _normalizeText(nextName).toLowerCase();
    if (normalized.isEmpty) {
      return false;
    }

    return devices
        .any((device) => device.name.trim().toLowerCase() == normalized);
  }

  bool _canFallbackToMockScan(String message) {
    return message.contains('未识别到可绑定设备') ||
        message.contains('扫码内容不能为空') ||
        message.contains('设备库存状态异常');
  }

  String _normalizeText(String value) => value.trim();

  void _clearTimers() {
    _configTimer?.cancel();
    _configTimer = null;
    _configTransitionTimer?.cancel();
    _configTransitionTimer = null;
  }

  @override
  void dispose() {
    _clearTimers();
    super.dispose();
  }
}

class _ScanBindingResolution {
  const _ScanBindingResolution({
    required this.mode,
    required this.notice,
  });

  final ScanBindingMode mode;
  final String notice;
}

final scanBindProvider =
    StateNotifierProvider.autoDispose<ScanBindNotifier, ScanBindState>((ref) {
  return ScanBindNotifier(
    ref,
    ref.watch(deviceServiceProvider),
    ref.watch(deviceBindingRuntimeServiceProvider),
  );
});
