import { useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { usePaginatedList } from '../../lib/usePaginatedList';
import type { OpsAlertListItem } from '../../types';

export function useAlertCenterController() {
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const {
    items: alerts,
    searchQuery,
    loading,
    error,
    setSearchQuery,
    refresh,
    clearError,
  } = usePaginatedList<OpsAlertListItem>('/ops/alerts', 'items', {
    level: levelFilter,
    status: statusFilter,
  });

  const stats = useMemo(
    () => ({
      pending: alerts.filter((alert) => alert.status === 'pending').length,
      resolved: alerts.filter((alert) => alert.status === 'resolved').length,
      falsePositive: alerts.filter((alert) => alert.status === 'false_positive').length,
    }),
    [alerts]
  );

  const handleResolve = async (id: string) => {
    clearError();
    try {
      await api.patch(`/ops/alerts/${id}/resolve`, { comment: '运维中台人工确认处理' });
      await refresh();
    } catch (requestError) {
      // error state handled via usePaginatedList's error when refresh fails
    }
  };

  const handleMarkAsFalsePositive = async (id: string) => {
    clearError();
    try {
      await api.patch(`/ops/alerts/${id}/false-positive`, { comment: '运维中台标记为误报' });
      await refresh();
    } catch (requestError) {
      // error state handled via usePaginatedList's error when refresh fails
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
