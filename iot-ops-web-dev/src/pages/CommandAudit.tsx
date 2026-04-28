import React, { useEffect, useMemo, useState } from 'react';
import {
  History,
  Search,
  User,
  Cpu,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';
import type { OpsCommandAuditItem } from '../types';

function formatTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export const CommandAudit = () => {
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
      const query = new URLSearchParams();
      query.set('page', '1');
      query.set('pageSize', '100');
      if (searchQuery) query.set('search', searchQuery);
      if (typeFilter) query.set('type', typeFilter);
      if (statusFilter) query.set('status', statusFilter);

      const result = await api.get<{ items: OpsCommandAuditItem[] }>(`/ops/commands?${query.toString()}`);
      setCommands(result.items || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '审计日志加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCommands();
  }, [searchQuery, typeFilter, statusFilter]);

  const commandTypes = useMemo(() => Array.from(new Set(commands.map((command) => command.commandType))), [commands]);

  return (
    <div className="p-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-black text-text-primary tracking-widest uppercase">控制审计</h2>
          <p className="text-text-secondary text-[10px] font-mono font-bold mt-1 tracking-[0.2em]">所有远程指令的不可篡改记录</p>
        </div>
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="搜索 SN、指令 ID 或执行人..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10 pr-4 py-2 bg-black/40 border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none w-64 transition-all"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="px-4 py-2 bg-black/40 border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all appearance-none"
          >
            <option value="">所有类型</option>
            {commandTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-4 py-2 bg-black/40 border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all appearance-none"
          >
            <option value="">所有状态</option>
            <option value="success">成功</option>
            <option value="pending">执行中</option>
            <option value="failed">失败</option>
            <option value="timeout">超时</option>
          </select>
          <button
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('');
              setStatusFilter('');
            }}
            className="p-2 bg-white/5 border border-border-subtle rounded-xl text-text-secondary hover:bg-white/10 hover:text-text-primary transition-all"
            title="重置筛选"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-dark rounded-2xl border border-danger/30 bg-danger/5 p-4 text-[10px] font-mono text-danger uppercase tracking-widest">
          {error}
        </div>
      )}

      <div className="glass-dark rounded-3xl border border-border-subtle overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-border-subtle">
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">指令 ID / 设备</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">发起人</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">指令类型</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">执行状态</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">时间线</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">备注/原因</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-8 py-20 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                  正在加载审计日志...
                </td>
              </tr>
            ) : commands.length > 0 ? commands.map((command) => (
              <tr key={command.id} className="hover:bg-brand/5 transition-all group border-b border-border-subtle last:border-0">
                <td className="px-8 py-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-border-subtle flex items-center justify-center mr-4">
                      <Cpu className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold text-text-primary tracking-tight">{command.id}</p>
                      <p className="text-[10px] font-mono text-text-secondary mt-1">{command.deviceSn}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center space-x-2">
                    <User className="w-3.5 h-3.5 text-text-secondary" />
                    <span className="text-[10px] font-mono font-bold text-text-primary">{command.operatorName}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-border-subtle text-[10px] font-mono font-bold text-text-primary uppercase tracking-widest">
                    {command.commandType}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center">
                    {command.status === 'success' ? (
                      <span className="flex items-center text-success text-[10px] font-mono font-bold uppercase">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> 成功
                      </span>
                    ) : command.status === 'pending' ? (
                      <span className="flex items-center text-brand text-[10px] font-mono font-bold uppercase animate-pulse">
                        <Clock className="w-3.5 h-3.5 mr-2" /> 执行中
                      </span>
                    ) : (
                      <span className="flex items-center text-danger text-[10px] font-mono font-bold uppercase">
                        <XCircle className="w-3.5 h-3.5 mr-2" /> {command.status === 'timeout' ? '超时' : '失败'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-[9px] font-mono text-text-secondary">起: {formatTime(command.startedAt)}</p>
                  <p className="text-[9px] font-mono text-text-secondary mt-1">止: {formatTime(command.finishedAt)}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-[10px] font-mono text-text-secondary">{command.failureReason || '-'}</p>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <History className="w-12 h-12 text-text-secondary opacity-20" />
                    <p className="text-text-secondary text-sm font-mono">未发现符合条件的审计记录</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
