import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/home.dart';
import '../services/api_client.dart';
import '../services/home_service.dart';

class HomeState {
  const HomeState({
    this.homes = const [],
    this.isLoading = false,
    this.hasLoaded = false,
    this.error,
  });

  static const Object _unset = Object();

  final List<Home> homes;
  final bool isLoading;
  final bool hasLoaded;
  final String? error;

  HomeState copyWith({
    List<Home>? homes,
    bool? isLoading,
    bool? hasLoaded,
    Object? error = _unset,
  }) {
    return HomeState(
      homes: homes ?? this.homes,
      isLoading: isLoading ?? this.isLoading,
      hasLoaded: hasLoaded ?? this.hasLoaded,
      error: identical(error, _unset) ? this.error : error as String?,
    );
  }
}

class HomeNotifier extends StateNotifier<HomeState> {
  HomeNotifier(this._service) : super(const HomeState());

  final HomeService _service;

  Future<void> loadHomes() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final homes = await _service.list();
      state = HomeState(homes: homes, hasLoaded: true);
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: extractErrorMessage(error, fallback: '家庭列表加载失败'),
      );
    }
  }

  Future<Home> createHome(String name) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final home = await _service.create(name);
      final homes = await _service.list();
      state = HomeState(homes: homes);
      return home;
    } catch (error) {
      final message = extractErrorMessage(error, fallback: '创建家庭失败');
      state = state.copyWith(isLoading: false, error: message);
      throw Exception(message);
    }
  }

  Future<void> deleteHome(String homeId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _service.remove(homeId);
      final homes = await _service.list();
      state = HomeState(homes: homes);
    } catch (error) {
      final message = extractErrorMessage(error, fallback: '删除家庭失败');
      state = state.copyWith(isLoading: false, error: message);
      throw Exception(message);
    }
  }

  Future<void> updateHomeDeviceLinks(
    String homeId,
    List<String> deviceIds,
  ) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _service.updateDeviceLinks(homeId, deviceIds);
      final homes = await _service.list();
      state = HomeState(homes: homes);
    } catch (error) {
      final message = extractErrorMessage(error, fallback: '更新家庭关联失败');
      state = state.copyWith(isLoading: false, error: message);
      throw Exception(message);
    }
  }

  Future<void> addMember(String homeId, String userId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _service.addMember(homeId, userId);
      final homes = await _service.list();
      state = HomeState(homes: homes);
    } catch (error) {
      final message = extractErrorMessage(error, fallback: '添加家庭成员失败');
      state = state.copyWith(isLoading: false, error: message);
      throw Exception(message);
    }
  }

  Future<void> removeMembers(String homeId, List<String> userIds) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _service.removeMembers(homeId, userIds);
      final homes = await _service.list();
      state = HomeState(homes: homes);
    } catch (error) {
      final message = extractErrorMessage(error, fallback: '移除家庭成员失败');
      state = state.copyWith(isLoading: false, error: message);
      throw Exception(message);
    }
  }
}

final homeProvider = StateNotifierProvider<HomeNotifier, HomeState>((ref) {
  return HomeNotifier(ref.watch(homeServiceProvider));
});
