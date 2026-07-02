import { useEffect, useState } from 'react';
import { usersApi, sharesApi, type OpsShareItem, type OpsUserDetailResponse, type OpsUserListItem } from '../../lib/api-users';
import type { UserManagementTab } from './user-management.types';

export function useUserManagementController() {
  const [activeTab, setActiveTab] = useState<UserManagementTab>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [users, setUsers] = useState<OpsUserListItem[]>([]);
  const [shares, setShares] = useState<OpsShareItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<OpsUserDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        if (activeTab === 'users') {
          const result = await usersApi.list({
            search: searchQuery,
            status: statusFilter,
          });
          if (!controller.signal.aborted) {
            setUsers(result.items || []);
          }
          return;
        }

        const result = await sharesApi.list({ search: searchQuery });
        if (!controller.signal.aborted) {
          setShares(result.items || []);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : '鏁版嵁鍔犺浇澶辫触');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadData();
    return () => controller.abort();
  }, [activeTab, searchQuery, statusFilter]);

  const handleOpenUser = async (uid: string) => {
    setDetailLoading(true);
    setError('');
    try {
      const result = await usersApi.detail(uid);
      setSelectedUser(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '鐢ㄦ埛璇︽儏鍔犺浇澶辫触');
    } finally {
      setDetailLoading(false);
    }
  };

  const switchTab = (tab: UserManagementTab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setStatusFilter('');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
  };

  const closeUserDetail = () => {
    setSelectedUser(null);
  };

  return {
    activeTab,
    searchQuery,
    statusFilter,
    users,
    shares,
    selectedUser,
    loading,
    detailLoading,
    error,
    setSearchQuery,
    setStatusFilter,
    handleOpenUser,
    switchTab,
    clearFilters,
    closeUserDetail,
  };
}
