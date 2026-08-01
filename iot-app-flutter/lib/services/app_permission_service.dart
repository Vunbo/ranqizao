import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';

enum AppPermissionDecision {
  granted,
  denied,
  permanentlyDenied,
  restricted,
}

class AppPermissionService {
  const AppPermissionService();

  Future<AppPermissionDecision> requestCamera() async {
    final status = await Permission.camera.request();
    if (status.isGranted) {
      return AppPermissionDecision.granted;
    }
    if (status.isPermanentlyDenied) {
      return AppPermissionDecision.permanentlyDenied;
    }
    if (status.isRestricted) {
      return AppPermissionDecision.restricted;
    }
    return AppPermissionDecision.denied;
  }

  Future<bool> openSettings() => openAppSettings();
}

final appPermissionServiceProvider = Provider<AppPermissionService>((ref) {
  return const AppPermissionService();
});
