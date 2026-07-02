import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/device.dart';
import '../services/device_service.dart';

class DeviceState {
  const DeviceState({
    this.devices = const [],
    this.selectedDevice,
    this.isLoading = false,
    this.hasLoaded = false,
    this.error,
    this.commandStatus,
  });

  static const Object _unset = Object();

  final List<Device> devices;
  final Device? selectedDevice;
  final bool isLoading;
  final bool hasLoaded;
  final String? error;
  final String? commandStatus;

  DeviceState copyWith({
    List<Device>? devices,
    Object? selectedDevice = _unset,
    bool? isLoading,
    bool? hasLoaded,
    Object? error = _unset,
    Object? commandStatus = _unset,
  }) {
    return DeviceState(
      devices: devices ?? this.devices,
      selectedDevice: identical(selectedDevice, _unset)
          ? this.selectedDevice
          : selectedDevice as Device?,
      isLoading: isLoading ?? this.isLoading,
      hasLoaded: hasLoaded ?? this.hasLoaded,
      error: identical(error, _unset) ? this.error : error as String?,
      commandStatus: identical(commandStatus, _unset)
          ? this.commandStatus
          : commandStatus as String?,
    );
  }
}

class DeviceNotifier extends StateNotifier<DeviceState> {
  DeviceNotifier(this._service) : super(const DeviceState());

  final DeviceService _service;

  Future<void> loadDevices({String? selectedDeviceId}) async {
    state = state.copyWith(
      isLoading: true,
      error: null,
    );

    try {
      final devices = await _service.list();
      final targetId = selectedDeviceId ?? state.selectedDevice?.id;
      final selectedDevice = _findById(devices, targetId);

      state = state.copyWith(
        devices: devices,
        selectedDevice: selectedDevice,
        isLoading: false,
        hasLoaded: true,
        error: null,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: error.toString(),
      );
    }
  }

  Future<void> loadDetail(String id) async {
    await loadDevices(selectedDeviceId: id);
    if (state.selectedDevice == null && state.error == null) {
      state = state.copyWith(error: '设备不存在或无权限。');
    }
  }

  Future<Device> updateDevice(
    String deviceId,
    Map<String, dynamic> payload,
  ) async {
    final updated = await _service.update(deviceId, payload);
    final devices = _replaceDevice(state.devices, updated);
    final selectedDevice =
        state.selectedDevice?.id == deviceId ? updated : state.selectedDevice;

    state = state.copyWith(
      devices: devices,
      selectedDevice: selectedDevice,
      error: null,
    );

    return updated;
  }

  Future<void> deleteDevice(String deviceId) async {
    await _service.remove(deviceId);
    final devices = state.devices
        .where((device) => device.id != deviceId)
        .toList(growable: false);

    state = state.copyWith(
      devices: devices,
      selectedDevice:
          state.selectedDevice?.id == deviceId ? null : state.selectedDevice,
      error: null,
    );
  }

  Future<void> shareDevice(String deviceId, String userId) async {
    await _service.share(deviceId, userId);
    await loadDetail(deviceId);
  }

  Future<void> unshareDevice(String deviceId, String userId) async {
    await _service.unshare(deviceId, userId);
    await loadDetail(deviceId);
  }

  Future<void> unshareDeviceMembers(
    String deviceId,
    List<String> userIds,
  ) async {
    if (userIds.isEmpty) {
      return;
    }

    await Future.wait(
      userIds.map((userId) => _service.unshare(deviceId, userId)),
    );
    await loadDetail(deviceId);
  }

  Future<void> createLog(
    String deviceId, {
    required String event,
    String type = 'info',
  }) async {
    await _service.createLog(
      deviceId,
      event: event,
      type: type,
    );
  }

  Future<bool> sendCommand(
    String deviceId,
    String command, {
    Map<String, dynamic>? extra,
  }) async {
    state = state.copyWith(commandStatus: 'pending', error: null);
    try {
      final result =
          await _service.sendCommand(deviceId, command, extra: extra);
      final cmdId = result['command_id'] as String?;
      if (cmdId != null) {
        for (var i = 0; i < 8; i++) {
          await Future.delayed(const Duration(seconds: 1));
          final status = await _service.pollCommand(cmdId);
          final currentStatus = status['status'] as String?;
          if (currentStatus == 'success' ||
              currentStatus == 'failed' ||
              currentStatus == 'timeout') {
            state = state.copyWith(commandStatus: currentStatus);
            await loadDetail(deviceId);
            return currentStatus == 'success';
          }
        }
        state = state.copyWith(commandStatus: 'timeout');
        return false;
      }
      state = state.copyWith(commandStatus: 'success');
      await loadDetail(deviceId);
      return true;
    } catch (error) {
      state = state.copyWith(
        commandStatus: 'failed',
        error: error.toString(),
      );
      return false;
    }
  }

  void clearCommandStatus() {
    state = state.copyWith(commandStatus: null);
  }

  Device? _findById(List<Device> devices, String? deviceId) {
    if (deviceId == null || deviceId.isEmpty) {
      return null;
    }

    for (final device in devices) {
      if (device.id == deviceId) {
        return device;
      }
    }

    return null;
  }

  List<Device> _replaceDevice(List<Device> devices, Device nextDevice) {
    var found = false;
    final updated = devices.map((device) {
      if (device.id != nextDevice.id) {
        return device;
      }
      found = true;
      return nextDevice;
    }).toList(growable: true);

    if (!found) {
      updated.add(nextDevice);
    }

    return updated;
  }
}

final deviceProvider =
    StateNotifierProvider<DeviceNotifier, DeviceState>((ref) {
  return DeviceNotifier(ref.watch(deviceServiceProvider));
});
