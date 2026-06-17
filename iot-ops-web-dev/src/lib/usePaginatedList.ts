import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

export interface PaginatedListOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginatedListState<T> {
  items: T[];
  searchQuery: string;
  loading: boolean;
  error: string;
}

export interface PaginatedListActions {
  setSearchQuery: (value: string) => void;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Shared hook for list pages that follow the ops pagination pattern.
 *
 * Each controller composes this and layers its own filters / actions on top.
 * Pass filter state via `filterParams` — the hook refetches whenever they change.
 */
export function usePaginatedList<T>(
  endpoint: string,
  listKey: string,
  filterParams: Record<string, string> = {},
  options: PaginatedListOptions = {}
): PaginatedListState<T> & PaginatedListActions {
  const { page = 1, pageSize = 100 } = options;

  const [items, setItems] = useState<T[]>([]);
  const [searchQuery, setSearchQueryState] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Track previous filter values to avoid breaking the exhaustive-deps rule
  // while still refetching when filters change.
  const filterRef = useRef(filterParams);
  filterRef.current = filterParams;

  const fetchItems = useCallback(
    async (search: string) => {
      setLoading(true);
      setError('');

      try {
        const query = new URLSearchParams();
        query.set('page', String(page));
        query.set('pageSize', String(pageSize));
        if (search) query.set('search', search);

        // Merge external filters (current ref values)
        for (const key of Object.keys(filterRef.current)) {
          const value = filterRef.current[key];
          if (value) query.set(key, value);
        }

        const result = await api.get<Record<string, T[]>>(`${endpoint}?${query.toString()}`);
        setItems((result?.[listKey] as T[]) || []);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : '数据加载失败');
      } finally {
        setLoading(false);
      }
    },
    [endpoint, listKey, page, pageSize]
  );

  const setSearchQuery = useCallback((value: string) => {
    setSearchQueryState(value);
  }, []);

  // Refetch when search or filters change
  useEffect(() => {
    void fetchItems(searchQuery);
  }, [searchQuery, filterParams, fetchItems]);

  const refresh = useCallback(async () => {
    await fetchItems(searchQuery);
  }, [fetchItems, searchQuery]);

  const clearError = useCallback(() => setError(''), []);

  return {
    items,
    searchQuery,
    loading,
    error,
    setSearchQuery,
    refresh,
    clearError,
  };
}
