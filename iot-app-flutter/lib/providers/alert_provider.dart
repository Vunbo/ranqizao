import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/alert.dart';
import '../services/alert_service.dart';

class AlertState {
  final List<Alert> alerts;
  final Alert? selectedAlert;
  final bool isLoading;
  final String? error;

  const AlertState({
    this.alerts = const [],
    this.selectedAlert,
    this.isLoading = false,
    this.error,
  });

  AlertState copyWith({
    List<Alert>? alerts,
    Alert? selectedAlert,
    bool? isLoading,
    String? error,
  }) =>
      AlertState(
        alerts: alerts ?? this.alerts,
        selectedAlert: selectedAlert ?? this.selectedAlert,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class AlertNotifier extends StateNotifier<AlertState> {
  AlertNotifier(this._service) : super(const AlertState());

  final AlertService _service;

  Future<void> loadAlerts({String? deviceId}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final alerts = await _service.list(deviceId: deviceId);
      state = AlertState(alerts: alerts);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadDetail(String id) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final alert = await _service.detail(id);
      state = state.copyWith(selectedAlert: alert, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> markRead(String id) async {
    try {
      await _service.markRead(id);
      await loadAlerts();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> ack(String id) async {
    try {
      await _service.ack(id);
      await loadAlerts();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}

final alertProvider =
    StateNotifierProvider<AlertNotifier, AlertState>((ref) {
  return AlertNotifier(ref.watch(alertServiceProvider));
});
