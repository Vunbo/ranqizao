import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Filter,
  MoreHorizontal,
  Flame,
  RefreshCw,
  Lock,
  Unlock,
  ChevronRight,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { OpsDeviceItem } from '../types';

function formatRelativeTime(value: string | null) {
  if (!value) return '未知';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`;
  return date.toLocaleString();
}

export const DeviceList = () => {
  const [devices, setDevices] = useState<OpsDeviceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    const loadDevices = async () => {
      setLoading(true);
      setError('');
      try {
        const query = new URLSearchParams();
        query.set('page', '1');
        query.set('pageSize', '100');
        if (searchTerm) query.set('search', searchTerm);
        if (statusFilter) query.set('status', statusFilter);
        if (modelFilter) query.set('model', modelFilter);

        const result = await api.get<{ items: OpsDeviceItem[] }>(`/ops/devices?${query.toString()}`);
        if (!controller.signal.aborted) {
          setDevices(result.items || []);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : '设备列表加载失败');
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

  return (
    <div className="p-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-display font-black text-text-primary tracking-widest uppercase">设备管理</h2>
          <p className="text-text-secondary text-[10px] font-mono font-bold mt-1 tracking-[0.2em]">全量设备资产与实时状态</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="搜索 SN、名称或所有者..."
              className="pl-10 pr-4 py-2 bg-black/40 border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none w-72 transition-all"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 border rounded-xl transition-all flex items-center space-x-2 ${isFilterOpen ? 'bg-brand/10 border-brand text-brand' : 'bg-white/5 border-border-subtle text-text-secondary hover:bg-white/10 hover:text-text-primary'}`}
            >
              <Filter className="w-5 h-5" />
              {(statusFilter || modelFilter) && (
                <span className="w-2 h-2 bg-brand rounded-full animate-pulse" />
              )}
            </button>

            {isFilterOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                <div className="absolute top-full mt-4 right-0 z-20 w-64 bg-bg-card border border-border-subtle rounded-2xl shadow-2xl p-6 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest mb-3 block">设备状态</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: '', label: '全部' },
                          { value: 'normal', label: '正常' },
                          { value: 'alert', label: '告警' },
                          { value: 'locked', label: '锁定' },
                          { value: 'offline', label: '离线' },
                        ].map((item) => (
                          <button
                            key={item.value || 'all'}
                            onClick={() => setStatusFilter(item.value)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold border transition-all ${statusFilter === item.value ? 'bg-brand text-black border-brand' : 'bg-white/5 border-border-subtle text-text-secondary hover:border-brand/50'}`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest mb-3 block">设备型号</label>
                      <div className="space-y-2">
                        <button
                          onClick={() => setModelFilter('')}
                          className={`w-full px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold border text-left transition-all ${modelFilter === '' ? 'bg-brand text-black border-brand' : 'bg-white/5 border-border-subtle text-text-secondary hover:border-brand/50'}`}
                        >
                          所有型号
                        </button>
                        {modelOptions.map((model) => (
                          <button
                            key={model}
                            onClick={() => setModelFilter(model)}
                            className={`w-full px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold border text-left transition-all ${modelFilter === model ? 'bg-brand text-black border-brand' : 'bg-white/5 border-border-subtle text-text-secondary hover:border-brand/50'}`}
                          >
                            {model}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setStatusFilter('');
                        setModelFilter('');
                        setSearchTerm('');
                      }}
                      className="w-full py-2 bg-white/5 border border-border-subtle rounded-xl text-[9px] font-mono font-bold text-text-secondary hover:text-brand hover:border-brand/50 transition-all"
                    >
                      重置筛选
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
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
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">设备信息</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">状态指标</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">版本/区域</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">最后心跳</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                  正在加载设备...
                </td>
              </tr>
            ) : devices.length > 0 ? devices.map((device) => (
              <tr key={device.id} className="hover:bg-brand/5 transition-all group cursor-pointer border-b border-border-subtle last:border-0">
                <td className="px-8 py-6" onClick={() => navigate(`/devices/${device.id}`)}>
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-border-subtle flex items-center justify-center mr-4 group-hover:border-brand/30 transition-all">
                      <Flame className={`w-6 h-6 ${device.online ? 'text-brand' : 'text-text-secondary'}`} />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-bold text-text-primary tracking-tight">{device.sn}</p>
                      <p className="text-[10px] font-mono text-text-secondary mt-0.5">{device.name} | {device.model}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center space-x-3 flex-wrap">
                    {device.online ? (
                      <span className="flex items-center px-2 py-0.5 rounded bg-success/10 text-success text-[8px] font-mono font-bold border border-success/20"><Wifi className="w-3 h-3 mr-1" />在线</span>
                    ) : (
                      <span className="flex items-center px-2 py-0.5 rounded bg-white/5 text-text-secondary text-[8px] font-mono font-bold border border-border-subtle"><WifiOff className="w-3 h-3 mr-1" />离线</span>
                    )}
                    {device.status === 'alert' && (
                      <span className="flex items-center px-2 py-0.5 rounded bg-danger/10 text-danger text-[8px] font-mono font-bold border border-danger/20 animate-pulse">告警</span>
                    )}
                    {device.fire && (
                      <span className="flex items-center px-2 py-0.5 rounded bg-warning/10 text-warning text-[8px] font-mono font-bold border border-warning/20">燃烧中</span>
                    )}
                    {device.locked && (
                      <span className="flex items-center px-2 py-0.5 rounded bg-danger/10 text-danger text-[8px] font-mono font-bold border border-danger/20">已锁定</span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-[10px] font-mono font-bold text-text-primary">{device.firmwareVersion || '-'}</p>
                  <p className="text-[10px] font-mono text-text-secondary mt-1">{device.region}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-[10px] font-mono text-text-secondary">{formatRelativeTime(device.lastHeartbeatAt)}</p>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                    <button
                      onClick={() => navigate(`/devices/${device.id}`)}
                      className="p-2.5 bg-white/5 border border-border-subtle text-text-secondary hover:text-brand hover:border-brand/50 rounded-xl transition-all"
                      title="详情"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button className="p-2.5 bg-white/5 border border-border-subtle text-text-secondary hover:text-danger hover:border-danger/50 rounded-xl transition-all" title={device.locked ? '解锁' : '锁定'}>
                      {device.locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                    <button className="p-2.5 bg-white/5 border border-border-subtle text-text-secondary hover:text-text-primary rounded-xl transition-all">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4 opacity-50">
                    <Search className="w-12 h-12 text-text-secondary" />
                    <p className="text-xs font-mono font-bold text-text-secondary uppercase tracking-widest">未找到匹配的设备</p>
                    <button
                      onClick={() => {
                        setStatusFilter('');
                        setModelFilter('');
                        setSearchTerm('');
                      }}
                      className="text-[10px] font-mono font-bold text-brand hover:underline"
                    >
                      重置所有筛选条件
                    </button>
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
