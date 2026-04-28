import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Smartphone,
  Share2,
  RefreshCw,
  X,
  LayoutGrid,
  Info
} from 'lucide-react';
import { api } from '../lib/api';
import type { OpsShareItem, OpsUserDetailResponse, OpsUserListItem } from '../types';

function formatTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export const UserManagement = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'shares'>('users');
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
          const query = new URLSearchParams();
          query.set('page', '1');
          query.set('pageSize', '100');
          if (searchQuery) query.set('search', searchQuery);
          if (statusFilter) query.set('status', statusFilter);
          const result = await api.get<{ items: OpsUserListItem[] }>(`/ops/users?${query.toString()}`);
          if (!controller.signal.aborted) {
            setUsers(result.items || []);
          }
        } else {
          const query = new URLSearchParams();
          query.set('page', '1');
          query.set('pageSize', '100');
          if (searchQuery) query.set('search', searchQuery);
          const result = await api.get<{ items: OpsShareItem[] }>(`/ops/shares?${query.toString()}`);
          if (!controller.signal.aborted) {
            setShares(result.items || []);
          }
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : '数据加载失败');
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
    try {
      const result = await api.get<OpsUserDetailResponse>(`/ops/users/${uid}`);
      setSelectedUser(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '用户详情加载失败');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="p-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-black text-text-primary tracking-widest uppercase">用户与共享</h2>
          <p className="text-text-secondary text-[10px] font-mono font-bold mt-1 tracking-[0.2em]">账户体系与设备授权拓扑查询</p>
        </div>
        <div className="flex space-x-6 items-center">
          <div className="flex bg-black/40 p-1 rounded-xl border border-border-subtle">
            <button
              onClick={() => {
                setActiveTab('users');
                setSearchQuery('');
                setStatusFilter('');
              }}
              className={`px-6 py-2 rounded-lg text-[10px] font-mono font-bold transition-all ${activeTab === 'users' ? 'bg-brand text-black brand-glow' : 'text-text-secondary hover:text-text-primary'}`}
            >
              用户列表
            </button>
            <button
              onClick={() => {
                setActiveTab('shares');
                setSearchQuery('');
                setStatusFilter('');
              }}
              className={`px-6 py-2 rounded-lg text-[10px] font-mono font-bold transition-all ${activeTab === 'shares' ? 'bg-brand text-black brand-glow' : 'text-text-secondary hover:text-text-primary'}`}
            >
              共享关系
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-dark rounded-2xl border border-danger/30 bg-danger/5 p-4 text-[10px] font-mono text-danger uppercase tracking-widest">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder={activeTab === 'users' ? '搜索 UID、名称、手机号或邮箱...' : '搜索 SN、所有者或共享对象...'}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10 pr-4 py-2 bg-black/40 border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none w-80 transition-all"
            />
          </div>
          {activeTab === 'users' && (
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="px-4 py-2 bg-black/40 border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all appearance-none"
            >
              <option value="">所有状态</option>
              <option value="active">正常</option>
              <option value="disabled">禁用</option>
            </select>
          )}
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('');
            }}
            className="p-2 bg-white/5 border border-border-subtle rounded-xl text-text-secondary hover:bg-white/10 hover:text-text-primary transition-all"
            title="重置筛选"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {activeTab === 'users' ? (
        <div className="glass-dark rounded-3xl border border-border-subtle overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border-subtle">
                <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">用户信息</th>
                <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">绑定设备</th>
                <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">共享设备</th>
                <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">状态</th>
                <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">最后活跃</th>
                <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                    正在加载用户数据...
                  </td>
                </tr>
              ) : users.length > 0 ? users.map((user) => (
                <tr key={user.uid} className="hover:bg-brand/5 transition-all group border-b border-border-subtle last:border-0">
                  <td className="px-8 py-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center mr-4">
                        <Smartphone className="w-5 h-5 text-brand" />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-bold text-text-primary tracking-tight">{user.displayName}</p>
                        <p className="text-[10px] font-mono text-text-secondary mt-1">{user.uid}</p>
                        <p className="text-[10px] font-mono text-text-secondary mt-1">{user.phone || user.email || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-mono font-bold text-text-primary">{user.bindCount}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-mono font-bold text-text-primary">{user.shareCount}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-mono font-bold border uppercase tracking-widest ${user.status === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-white/5 text-text-secondary border-border-subtle'}`}>
                      {user.status === 'active' ? '正常' : '禁用'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-[10px] font-mono text-text-secondary">{formatTime(user.lastLoginAt)}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button
                      onClick={() => handleOpenUser(user.uid)}
                      className="p-2 bg-white/5 border border-border-subtle text-text-secondary hover:text-brand hover:border-brand/40 rounded-xl transition-all"
                      title="查看详情"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <Users className="w-12 h-12 text-text-secondary opacity-20" />
                      <p className="text-text-secondary text-sm font-mono">未发现符合条件的用户</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-dark rounded-3xl border border-border-subtle overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border-subtle">
                <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">设备 SN</th>
                <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">设备名称</th>
                <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">主账号</th>
                <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">被分享用户</th>
                <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">权限列表</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                    正在加载共享关系...
                  </td>
                </tr>
              ) : shares.length > 0 ? shares.map((share) => (
                <tr key={share.id} className="hover:bg-brand/5 transition-all group border-b border-border-subtle last:border-0">
                  <td className="px-8 py-6">
                    <p className="font-mono text-sm font-bold text-text-primary tracking-tight">{share.resourceSn}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-[10px] font-mono text-text-secondary">{share.resourceName}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-[10px] font-mono text-text-secondary">{share.ownerDisplayName} ({share.ownerUid})</p>
                  </td>
                  <td className="px-8 py-6 text-brand">
                    <p className="text-[10px] font-mono font-bold">{share.sharedToDisplayName} ({share.sharedToUid})</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-2">
                      {share.permissions.map((permission) => (
                        <span key={permission} className="px-2 py-0.5 rounded bg-white/5 border border-border-subtle text-[8px] font-mono text-text-secondary uppercase">
                          {permission}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <Share2 className="w-12 h-12 text-text-secondary opacity-20" />
                      <p className="text-text-secondary text-sm font-mono">未发现符合条件的共享关系</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-4xl bg-bg-card border border-border-subtle rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between px-8 py-6 border-b border-border-subtle bg-white/5">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-black text-text-primary tracking-widest uppercase">用户详情</h3>
                  <p className="text-text-secondary text-[10px] font-mono font-bold mt-0.5 tracking-widest uppercase">
                    {selectedUser.user.displayName} / {selectedUser.user.uid}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all text-text-secondary hover:text-text-primary"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-10 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                正在加载用户详情...
              </div>
            ) : (
              <div className="p-8 grid grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <LayoutGrid className="w-5 h-5 text-brand" />
                    <h4 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">已绑定设备 ({selectedUser.boundDevices.length})</h4>
                  </div>
                  <div className="space-y-3">
                    {selectedUser.boundDevices.length > 0 ? selectedUser.boundDevices.map((device) => (
                      <div key={device.id} className="p-4 bg-white/5 border border-border-subtle rounded-2xl hover:border-brand/30 transition-all group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-text-primary">{device.sn}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${device.status === 'normal' ? 'bg-success/10 text-success border-success/20' : device.status === 'alert' ? 'bg-danger/10 text-danger border-danger/20' : device.status === 'locked' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-white/5 text-text-secondary border-border-subtle'}`}>
                            {device.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary">
                          <span>型号: {device.model}</span>
                          <span>区域: {device.region}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="py-10 text-center border border-dashed border-border-subtle rounded-2xl">
                        <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">暂无绑定设备</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <Share2 className="w-5 h-5 text-brand" />
                    <h4 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">已分享设备 ({selectedUser.sharedDevices.length})</h4>
                  </div>
                  <div className="space-y-3">
                    {selectedUser.sharedDevices.length > 0 ? selectedUser.sharedDevices.map((device) => (
                      <div key={device.id} className="p-4 bg-white/5 border border-border-subtle rounded-2xl hover:border-brand/30 transition-all group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-text-primary">{device.sn}</span>
                          <div className="flex gap-1">
                            {device.permissions.map((permission) => (
                              <span key={permission} className="px-2 py-0.5 rounded bg-brand/10 border border-brand/20 text-[8px] font-mono font-bold text-brand uppercase">
                                {permission}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary">
                          <span>型号: {device.model}</span>
                          <span>主账号: {device.ownerDisplayName}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="py-10 text-center border border-dashed border-border-subtle rounded-2xl">
                        <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">暂无分享设备</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
