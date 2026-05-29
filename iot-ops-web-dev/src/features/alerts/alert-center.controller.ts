import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import type { OpsAlertListItem } from '../../types';

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
      const query = new URLSearchParams();
      query.set('page', '1');
      query.set('pageSize', '100');
      if (searchQuery) query.set('search', searchQuery);
      if (levelFilter) query.set('level', levelFilter);
      if (statusFilter) query.set('status', statusFilter);

      const result = await api.get<{ items: OpsAlertListItem[] }>(`/ops/alerts?${query.toString()}`);
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
      await api.patch(`/ops/alerts/${id}/resolve`, { comment: '杩愮淮涓彴浜哄伐纭澶勭悊' });
      await fetchAlerts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '鍛婅澶勭悊澶辫触');
    }
  };

  const handleMarkAsFalsePositive = async (id: string) => {
    setError('');
    try {
      await api.patch(`/ops/alerts/${id}/false-positive`, { comment: '杩愮淮涓彴鏍囪涓鸿鎶?' });
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
