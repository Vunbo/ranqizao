import { useEffect, useMemo, useState } from 'react';
import { alertsApi } from '../../lib/api-alerts';
import type { OpsAlertListItem } from '../../lib/api-alerts';

export function useAlertCenterController() {
  const [alerts, setAlerts] = useState<OpsAlertListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await alertsApi.list({
        search: searchQuery,
        level: levelFilter,
        status: statusFilter,
      });
      setAlerts(result.items || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '鍛婅鍒楄〃鍔犺浇澶辫触');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAlerts();
  }, [searchQuery, levelFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      pending: alerts.filter((alert) => alert.status === 'pending').length,
      resolved: alerts.filter((alert) => alert.status === 'resolved').length,
      falsePositive: alerts.filter((alert) => alert.status === 'false_positive').length,
    }),
    [alerts]
  );

  const handleResolve = async (id: string) => {
    setError('');
    try {
      await alertsApi.resolve(id, '运维中台人工确认处理');
      await fetchAlerts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '鍛婅澶勭悊澶辫触');
    }
  };

  const handleMarkAsFalsePositive = async (id: string) => {
    setError('');
    try {
      await alertsApi.markFalsePositive(id, '运维中台标记为误报');
      await fetchAlerts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '鍛婅鏍囪澶辫触');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setLevelFilter('');
    setStatusFilter('');
  };

  return {
    alerts,
    searchQuery,
    levelFilter,
    statusFilter,
    loading,
    error,
    stats,
    setSearchQuery,
    setLevelFilter,
    setStatusFilter,
    handleResolve,
    handleMarkAsFalsePositive,
    clearFilters,
  };
}
