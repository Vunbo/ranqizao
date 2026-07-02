import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants.dart';
import '../models/device.dart';
import 'api_client.dart';

class DeviceService {
  const DeviceService(this._api);

  final ApiClient _api;

  Future<List<Device>> list() async {
    final res = await _api.get(ApiConstants.devices);
    final data = readResponseMap(res.data);
    final list = (data['devices'] ?? data['items'] ?? const []) as List;
    return list
        .whereType<Map>()
        .map((item) => Device.fromJson(Map<String, dynamic>.from(item)))
        .toList(growable: false);
  }

  Future<Map<String, dynamic>> scanBindable(String qrCode) async {
    final res = await _api.post(
      ApiConstants.deviceBindScan,
      data: {
        'qrCode': qrCode,
      },
    );
    return readResponseMap(res.data);
  }

  Future<Device> bindScanned({
    required String qrCode,
    required String name,
    Map<String, dynamic>? location,
    String? wifiSsid,
    String? wifiPassword,
  }) async {
    final res = await _api.post(
      ApiConstants.deviceBind,
      data: {
        'qrCode': qrCode,
        'name': name,
        if (location != null) 'location': location,
        if (wifiSsid != null && wifiSsid.trim().isNotEmpty)
          'wifiSsid': wifiSsid.trim(),
        if (wifiPassword != null && wifiPassword.isNotEmpty)
          'wifiPassword': wifiPassword,
      },
    );
    final data = readResponseMap(res.data);
    return Device.fromJson(readResponseMap(data['device']));
  }

  Future<Device> create({
    required String name,
    Map<String, dynamic>? location,
  }) async {
    final res = await _api.post(
      ApiConstants.devices,
      data: {
        'name': name,
        if (location != null) 'location': location,
      },
    );
    final data = readResponseMap(res.data);
    return Device.fromJson(readResponseMap(data['device']));
  }

  Future<Device> update(
    String deviceId,
    Map<String, dynamic> payload,
  ) async {
    final res = await _api.patch(
      ApiConstants.deviceDetail(deviceId),
      data: payload,
    );
    final data = readResponseMap(res.data);
    return Device.fromJson(readResponseMap(data['device']));
  }

  Future<void> remove(String deviceId) async {
    await _api.delete(ApiConstants.deviceDetail(deviceId));
  }

  Future<List<Map<String, dynamic>>> logs(String deviceId) async {
    final res = await _api.get(ApiConstants.deviceLogs(deviceId));
    final data = readResponseMap(res.data);
    final list = (data['items'] ?? data['logs'] ?? const []) as List;
    return list
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: false);
  }

  Future<Map<String, dynamic>> createLog(
    String deviceId, {
    required String event,
    String type = 'info',
  }) async {
    final res = await _api.post(
      ApiConstants.deviceLogs(deviceId),
      data: {
        'event': event,
        'type': type,
      },
    );
    return readResponseMap(res.data);
  }

  Future<void> share(String deviceId, String userId) async {
    await _api.post(
      ApiConstants.deviceShare(deviceId),
      data: {
        'userId': userId,
      },
    );
  }

  Future<void> unshare(String deviceId, String userId) async {
    await _api.delete(ApiConstants.deviceShareMember(deviceId, userId));
  }

  Future<Map<String, dynamic>> sendCommand(
    String deviceId,
    String command, {
    Map<String, dynamic>? extra,
  }) async {
    final res = await _api.post(
      ApiConstants.deviceCommand(deviceId, command),
      data: extra ?? const {},
    );
    return readResponseMap(res.data);
  }

  Future<Map<String, dynamic>> pollCommand(String commandId) async {
    final res = await _api.get('/commands/$commandId');
    return readResponseMap(res.data);
  }
}

final deviceServiceProvider = Provider<DeviceService>((ref) {
  return DeviceService(ref.watch(apiClientProvider));
});