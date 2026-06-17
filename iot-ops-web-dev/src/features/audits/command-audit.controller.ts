import { useMemo, useState } from 'react';
import { usePaginatedList } from '../../lib/usePaginatedList';
import type { OpsCommandAuditItem } from '../../types';

export function useCommandAuditController() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const {
    items: commands,
    searchQuery,
    loading,
    error,
    setSearchQuery,
    clearError,
  } = usePaginatedList<OpsCommandAuditItem>('/ops/commands', 'items', { type: typeFilter, status: statusFilter });

  const commandTypes = useMemo(
    () => Array.from(new Set(commands.map((command) => command.commandType))),
    [commands]
  );

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('');
    setStatusFilter('');
  };

  return {
    searchQuery,
    typeFilter,
    statusFilter,
    commands,
    loading,
    error,
    commandTypes,
    setSearchQuery,
    setTypeFilter,
    setStatusFilter,
    clearFilters,
  };
}
