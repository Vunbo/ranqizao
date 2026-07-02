import { useEffect, useMemo, useState } from 'react';
import { commandsApi, type OpsCommandAuditItem } from '../../lib/api-commands';

export function useCommandAuditController() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [commands, setCommands] = useState<OpsCommandAuditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCommands = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await commandsApi.list({
        search: searchQuery,
        type: typeFilter,
        status: statusFilter,
      });
      setCommands(result.items || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '瀹¤鏃ュ織鍔犺浇澶辫触');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCommands();
  }, [searchQuery, typeFilter, statusFilter]);

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
