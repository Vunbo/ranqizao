import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

class SessionStore {
  SessionStore(this._box);

  static const String boxName = 'app_session';
  static const String authTokenKey = 'ai-iot-safety-stove-control.auth-token';

  final Box<String> _box;

  static Future<void> initialize() async {
    await Hive.initFlutter();
    if (!Hive.isBoxOpen(boxName)) {
      await Hive.openBox<String>(boxName);
    }
  }

  String getAuthToken() {
    return (_box.get(authTokenKey) ?? '').trim();
  }

  Future<void> persistAuthToken(String token) async {
    await _box.put(authTokenKey, token);
  }

  Future<void> clearStoredSession() async {
    await _box.delete(authTokenKey);
  }
}

final sessionStoreProvider = Provider<SessionStore>((ref) {
  return SessionStore(Hive.box<String>(SessionStore.boxName));
});
