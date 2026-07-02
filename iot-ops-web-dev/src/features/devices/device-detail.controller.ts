import { useEffect, useState } from 'react';
import { devicesApi, type DeviceControlCommand, type OpsDeviceAlert, type OpsDeviceCommand, type OpsDeviceDetailResponse, type OpsDeviceMetrics } from '../../lib/api-devices';

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
      devicesApi.detail(targetId),
      devicesApi.metrics(targetId),
      devicesApi.alerts(targetId),
      devicesApi.commands(targetId),
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
      await devicesApi.control(deviceId, command);
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
