import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants.dart';
import '../models/home.dart';
import 'api_client.dart';

class HomeService {
  const HomeService(this._api);

  final ApiClient _api;

  Future<List<Home>> list() async {
    final res = await _api.get(ApiConstants.homes);
    final data = readResponseMap(res.data);
    final rawList = data['homes'] ?? data['items'];
    if (rawList is! List) {
      return const <Home>[];
    }

    return rawList
        .whereType<Map>()
        .map((item) => Home.fromJson(Map<String, dynamic>.from(item)))
        .toList(growable: false);
  }

  Future<Home> create(String name) async {
    final res = await _api.post(
      ApiConstants.homes,
      data: {
        'name': name,
      },
    );
    final data = readResponseMap(res.data);
    return Home.fromJson(readResponseMap(data['home']));
  }

  Future<void> remove(String homeId) async {
    await _api.delete(ApiConstants.homeDetail(homeId));
  }

  Future<void> updateDeviceLinks(String homeId, List<String> deviceIds) async {
    await _api.patch(
      ApiConstants.homeDeviceLinks(homeId),
      data: {
        'deviceIds': deviceIds,
      },
    );
  }

  Future<void> addMember(String homeId, String userId) async {
    await _api.post(
      ApiConstants.homeMembers(homeId),
      data: {
        'userId': userId,
      },
    );
  }

  Future<void> removeMembers(String homeId, List<String> userIds) async {
    await _api.delete(
      ApiConstants.homeMembers(homeId),
      data: {
        'userIds': userIds,
      },
    );
  }
}

final homeServiceProvider = Provider<HomeService>((ref) {
  return HomeService(ref.watch(apiClientProvider));
});
