import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api_client.dart';
import '../core/constants.dart';
import '../models/alert.dart';

class AlertService {
  const AlertService(this._api);
  final ApiClient _api;

  Future<List<Alert>> list({String? deviceId}) async {
    final query = <String, dynamic>{};
    if (deviceId != null) query['device_id'] = deviceId;
    final res = await _api.get(ApiConstants.alerts, query: query);
    final list = (res.data['items'] ?? res.data['alerts'] ?? []) as List;
    return list
        .map((e) => Alert.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Alert> detail(String id) async {
    final res = await _api.get(ApiConstants.alertDetail(id));
    return Alert.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> markRead(String id) async {
    await _api.post(ApiConstants.alertRead(id));
  }

  Future<void> ack(String id) async {
    await _api.post(ApiConstants.alertAck(id));
  }
}

final alertServiceProvider = Provider<AlertService>((ref) {
  return AlertService(ref.watch(apiClientProvider));
});
