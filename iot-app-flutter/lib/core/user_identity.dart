import '../models/device.dart';
import '../models/user.dart';

String deriveShortUid(String? uid) {
  final normalized = uid?.trim() ?? '';
  if (normalized.isEmpty) {
    return '';
  }

  return normalized.length >= 8 ? normalized.substring(0, 8) : normalized;
}

String resolveUserShortUid(User? user) {
  if (user == null) {
    return '';
  }

  final shortUid = user.shortUid.trim();
  if (shortUid.isNotEmpty) {
    return shortUid;
  }

  return deriveShortUid(user.uid);
}

bool isDeviceOwnedByUser(Device device, User? user) {
  final ownerId = device.ownerId?.trim() ?? '';
  if (ownerId.isEmpty || user == null) {
    return false;
  }

  final shortUid = resolveUserShortUid(user);
  final uid = user.uid.trim();
  return ownerId == shortUid || ownerId == uid;
}
