import { useEffect, useMemo, useState } from 'react';
import { devicesApi, type OpsDeviceItem } from '../../lib/api-devices';

export function useDeviceListController() {
  const [devices, setDevices] = useState<OpsDeviceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const loadDevices = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await devicesApi.list({
          search: searchTerm,
          status: statusFilter,
          model: modelFilter,
        });
        if (!controller.signal.aborted) {
          setDevices(result.items || []);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : '璁惧鍒楄〃鍔犺浇澶辫触');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadDevices();
    return () => controller.abort();
  }, [searchTerm, statusFilter, modelFilter]);

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
