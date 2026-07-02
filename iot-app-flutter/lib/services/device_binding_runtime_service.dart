import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

import '../models/device_binding.dart';

class DeviceBindingRuntimeService {
  const DeviceBindingRuntimeService();

  Future<void> ensureCameraPermission() async {
    final status = await Permission.camera.request();
    if (status.isGranted) {
      return;
    }

    throw const DeviceBindingPermissionException(
      type: DeviceBindingPermissionType.camera,
      message: '需要开启摄像头权限',
    );
  }

  Future<BindingLocationPayload> requestCurrentLocation() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) {
      throw Exception('系统定位服务未开启，请先开启定位服务');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw const DeviceBindingPermissionException(
        type: DeviceBindingPermissionType.location,
        message: '需要开启定位权限',
      );
    }

    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
      ),
    );

    Placemark? placemark;
    try {
      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );
      if (placemarks.isNotEmpty) {
        placemark = placemarks.first;
      }
    } catch (_) {
      placemark = null;
    }

    final converted = _wgs84ToGcj02(
      latitude: position.latitude,
      longitude: position.longitude,
    );
    final street = _firstText(
      placemark?.thoroughfare,
      placemark?.street,
    );
    final streetNum = _firstText(placemark?.subThoroughfare);
    final province = _firstText(placemark?.administrativeArea);
    final city = _firstText(
      placemark?.locality,
      placemark?.subAdministrativeArea,
      province,
    );
    final district = _firstText(
      placemark?.subLocality,
      placemark?.subAdministrativeArea,
    );
    final name = _firstText(
      placemark?.name,
      street,
    );
    final address = [
      placemark?.country,
      province,
      city,
      district,
      street,
      streetNum,
    ]
        .map((value) => _firstText(value))
        .where((value) => value.isNotEmpty)
        .join();

    return BindingLocationPayload(
      latitude: converted.latitude,
      longitude: converted.longitude,
      address: address,
      formattedAddress: address,
      name: name,
      poiName: name,
      country: _firstText(placemark?.country),
      province: province,
      city: city,
      district: district,
      street: street,
      streetNum: streetNum,
      coordType: 'gcj02',
      source: 'geolocator',
      capturedAt: DateTime.now().toIso8601String(),
    );
  }

  Future<void> openSystemSettings() async {
    final opened = await openAppSettings();
    if (!opened) {
      throw Exception('打开系统权限设置失败');
    }
  }
}

final deviceBindingRuntimeServiceProvider =
    Provider<DeviceBindingRuntimeService>((ref) {
  return const DeviceBindingRuntimeService();
});

String _firstText(String? first, [String? second, String? third]) {
  final values = [first, second, third];
  for (final value in values) {
    final text = value?.trim() ?? '';
    if (text.isNotEmpty) {
      return text;
    }
  }

  return '';
}

class _CoordinatePair {
  const _CoordinatePair({
    required this.latitude,
    required this.longitude,
  });

  final double latitude;
  final double longitude;
}

const double _earthA = 6378245.0;
const double _earthEe = 0.00669342162296594323;

_CoordinatePair _wgs84ToGcj02({
  required double latitude,
  required double longitude,
}) {
  if (_outOfChina(latitude, longitude)) {
    return _CoordinatePair(
      latitude: latitude,
      longitude: longitude,
    );
  }

  var dLat = _transformLat(longitude - 105.0, latitude - 35.0);
  var dLon = _transformLon(longitude - 105.0, latitude - 35.0);
  final radLat = latitude / 180.0 * math.pi;
  var magic = math.sin(radLat);
  magic = 1 - _earthEe * magic * magic;
  final sqrtMagic = math.sqrt(magic);
  dLat = (dLat * 180.0) /
      ((_earthA * (1 - _earthEe)) / (magic * sqrtMagic) * math.pi);
  dLon = (dLon * 180.0) / (_earthA / sqrtMagic * math.cos(radLat) * math.pi);

  return _CoordinatePair(
    latitude: latitude + dLat,
    longitude: longitude + dLon,
  );
}

bool _outOfChina(double latitude, double longitude) {
  return longitude < 72.004 ||
      longitude > 137.8347 ||
      latitude < 0.8293 ||
      latitude > 55.8271;
}

double _transformLat(double x, double y) {
  var result = -100.0 +
      2.0 * x +
      3.0 * y +
      0.2 * y * y +
      0.1 * x * y +
      0.2 * math.sqrt(x.abs());
  result += (20.0 * math.sin(6.0 * x * math.pi) +
          20.0 * math.sin(2.0 * x * math.pi)) *
      2.0 /
      3.0;
  result +=
      (20.0 * math.sin(y * math.pi) + 40.0 * math.sin(y / 3.0 * math.pi)) *
          2.0 /
          3.0;
  result += (160.0 * math.sin(y / 12.0 * math.pi) +
          320 * math.sin(y * math.pi / 30.0)) *
      2.0 /
      3.0;
  return result;
}

double _transformLon(double x, double y) {
  var result = 300.0 +
      x +
      2.0 * y +
      0.1 * x * x +
      0.1 * x * y +
      0.1 * math.sqrt(x.abs());
  result += (20.0 * math.sin(6.0 * x * math.pi) +
          20.0 * math.sin(2.0 * x * math.pi)) *
      2.0 /
      3.0;
  result +=
      (20.0 * math.sin(x * math.pi) + 40.0 * math.sin(x / 3.0 * math.pi)) *
          2.0 /
          3.0;
  result += (150.0 * math.sin(x / 12.0 * math.pi) +
          300.0 * math.sin(x / 30.0 * math.pi)) *
      2.0 /
      3.0;
  return result;
}
