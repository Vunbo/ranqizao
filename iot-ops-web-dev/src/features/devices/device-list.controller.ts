import { useMemo, useState } from 'react';
import { usePaginatedList } from '../../lib/usePaginatedList';
import type { OpsDeviceItem } from '../../types';

export function useDeviceListController() {
  const [statusFilter, setStatusFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const {
    items: devices,
    searchQuery: searchTerm,
    loading,
    error,
    setSearchQuery: setSearchTerm,
    clearError,
  } = usePaginatedList<OpsDeviceItem>('/ops/devices', 'items', {
    status: statusFilter,
    model: modelFilter,
  });

  const modelOptions = useMemo(
    () => Array.from(new Set(devices.map((device) => device.model).filter((model): model is string => Boolean(model)))),
    [devices]
  );

  const clearFilters = () => {
    setStatusFilter('');
    setModelFilter('');
    setSearchTerm('');
  };

  return {
    devices,
    searchTerm,
    statusFilter,
    modelFilter,
    isFilterOpen,
    loading,
    error,
    modelOptions,
    setSearchTerm,
    setStatusFilter,
    setModelFilter,
    setIsFilterOpen,
    clearFilters,
  };
}
