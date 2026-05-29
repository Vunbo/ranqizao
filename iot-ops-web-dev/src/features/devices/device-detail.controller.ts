import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type {
  OpsDeviceAlert,
  OpsDeviceCommand,
  OpsDeviceDetailResponse,
  OpsDeviceMetrics,
} from '../../types';

export type DeviceControlCommand = 'lock_device' | 'unlock_device' | 'ignite' | 'shutdown';

export function useDeviceDetailController(deviceId?: string) {
  const [detail, setDetail] = useState<OpsDeviceDetailResponse | null>(null);
  const [metrics, setMetrics] = useState<OpsDeviceMetrics | null>(null);
  const [alerts, setAlerts] = useState<OpsDeviceAlert[]>([]);
  const [commands, setCommands] = useState<OpsDeviceCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async (targetId: string) => {
    const [detailResponse, metricsResponse, alertsResponse, commandsResponse] = await Promise.all([
      api.get<OpsDeviceDetailResponse>(`/ops/devices/${targetId}`),
      api.get<{ metrics: OpsDeviceMetrics }>(`/ops/devices/${targetId}/metrics/realtime`),
      api.get<{ items: OpsDeviceAlert[] }>(`/ops/devices/${targetId}/alerts`),
      api.get<{ items: OpsDeviceCommand[] }>(`/ops/devices/${targetId}/commands`),
    ]);

    setDetail(detailResponse);
    setMetrics(metricsResponse.metrics);
    setAlerts(alertsResponse.items || []);
    setCommands(commandsResponse.items || []);
  };

  useEffect(() => {
    if (!deviceId) {
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        await loadData(deviceId);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : '璁惧璇︽儏鍔犺浇澶辫触');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => controller.abort();
  }, [deviceId]);

  const handleControl = async (command: DeviceControlCommand) => {
    if (!deviceId) return;
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/ops/devices/${deviceId}/control`, {
        command,
        reason: '杩愮淮涓彴浜哄伐鎺у埗',
      });
      await loadData(deviceId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '璁惧鎺у埗澶辫触');
    } finally {
      setActionLoading(false);
    }
  };

  return {
    detail,
    metrics,
    alerts,
    commands,
    loading,
    actionLoading,
    error,
    handleControl,
  };
}
