import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Flame,
  Wifi,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Clock,
  History,
  Users,
  Settings,
  Zap,
  Power
} from 'lucide-react';
import { api } from '../lib/api';
import type {
  OpsDeviceAlert,
  OpsDeviceCommand,
  OpsDeviceDetailResponse,
  OpsDeviceMetrics,
} from '../types';

function formatTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export const DeviceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<OpsDeviceDetailResponse | null>(null);
  const [metrics, setMetrics] = useState<OpsDeviceMetrics | null>(null);
  const [alerts, setAlerts] = useState<OpsDeviceAlert[]>([]);
  const [commands, setCommands] = useState<OpsDeviceCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async (deviceId: string) => {
    const [detailResponse, metricsResponse, alertsResponse, commandsResponse] = await Promise.all([
      api.get<OpsDeviceDetailResponse>(`/ops/devices/${deviceId}`),
      api.get<{ metrics: OpsDeviceMetrics }>(`/ops/devices/${deviceId}/metrics/realtime`),
      api.get<{ items: OpsDeviceAlert[] }>(`/ops/devices/${deviceId}/alerts`),
      api.get<{ items: OpsDeviceCommand[] }>(`/ops/devices/${deviceId}/commands`),
    ]);

    setDetail(detailResponse);
    setMetrics(metricsResponse.metrics);
    setAlerts(alertsResponse.items || []);
    setCommands(commandsResponse.items || []);
  };

  useEffect(() => {
    if (!id) {
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        await loadData(id);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : '设备详情加载失败');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => controller.abort();
  }, [id]);

  const handleControl = async (command: 'lock_device' | 'unlock_device' | 'ignite' | 'shutdown') => {
    if (!id) return;
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/ops/devices/${id}/control`, {
        command,
        reason: '运维中台人工控制',
      });
      await loadData(id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '设备控制失败');
    } finally {
      setActionLoading(false);
    }
  };

  const device = detail?.device;
  const owner = detail?.owner;

  return (
    <div className="p-10 space-y-8">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/devices')}
          className="p-2 bg-white/5 border border-border-subtle rounded-xl text-text-secondary hover:text-text-primary transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-display font-black text-text-primary tracking-widest uppercase">设备详情</h2>
          <p className="text-text-secondary text-[10px] font-mono font-bold mt-1 tracking-[0.2em]">
            SN: {device?.sn || '-'} | 节点 ID: {device?.id || id}
          </p>
        </div>
      </div>

      {error && (
        <div className="glass-dark rounded-2xl border border-danger/30 bg-danger/5 p-4 text-[10px] font-mono text-danger uppercase tracking-widest">
          {error}
        </div>
      )}

      {loading && !device ? (
        <div className="glass-dark rounded-3xl border border-border-subtle p-10 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
          正在加载设备详情...
        </div>
      ) : device ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-dark p-8 rounded-3xl border border-border-subtle">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-2 text-brand" /> 基础信息
                </h3>
                <button className="p-2 hover:bg-white/5 rounded-lg transition-all text-text-secondary">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                {[
                  { label: '设备 SN', value: device.sn },
                  { label: '设备名称', value: device.name },
                  { label: '型号', value: device.model },
                  { label: '所属区域', value: device.region },
                  { label: '固件版本', value: device.firmwareVersion || '-' },
                  { label: '创建时间', value: formatTime(device.createdAt) },
                ].map((item, index) => (
                  <div key={index}>
                    <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-sm font-bold text-text-primary">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-dark p-8 rounded-3xl border border-border-subtle">
              <h3 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase mb-8 flex items-center">
                <Zap className="w-4 h-4 mr-2 text-brand" /> 最新状态
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: '在线状态', value: metrics?.online ? '在线' : '离线', icon: Wifi, color: metrics?.online ? 'text-success' : 'text-danger' },
                  { label: '火状态', value: metrics?.fire ? '燃烧中' : '未点火', icon: Flame, color: metrics?.fire ? 'text-warning' : 'text-text-secondary' },
                  { label: '锁定状态', value: metrics?.locked ? '已锁定' : '未锁定', icon: Lock, color: metrics?.locked ? 'text-danger' : 'text-success' },
                  { label: '最后心跳', value: formatTime(device.lastHeartbeatAt), icon: Clock, color: 'text-brand' },
                ].map((item, index) => (
                  <div key={index} className="bg-white/5 p-4 rounded-2xl border border-border-subtle">
                    <div className="flex items-center justify-between mb-3">
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-[9px] font-mono text-text-secondary uppercase">{item.label}</span>
                    </div>
                    <p className="text-lg font-bold text-text-primary">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {[
                  { label: '火力档位', value: `${metrics?.fireLevel || 0} 档`, sub: 'AI 智能调节' },
                  { label: '核心温度', value: `${metrics?.temp ?? 0} °C`, sub: '实时遥测' },
                  { label: '燃气浓度', value: `${metrics?.gas ?? 0} %LEL`, sub: metrics?.valveStatus || 'closed' },
                ].map((item, index) => (
                  <div key={index} className="bg-white/5 p-4 rounded-2xl border border-border-subtle">
                    <p className="text-[9px] font-mono text-text-secondary uppercase mb-1">{item.label}</p>
                    <p className="text-xl font-black text-text-primary">{item.value}</p>
                    <p className="text-[9px] font-mono text-brand mt-1">{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="glass-dark p-6 rounded-3xl border border-border-subtle">
              <h3 className="text-xs font-display font-bold text-text-primary tracking-widest uppercase mb-6 flex items-center">
                <Power className="w-4 h-4 mr-2 text-brand" /> 运维控制
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={actionLoading || metrics?.locked === true}
                  onClick={() => handleControl('ignite')}
                  className="px-4 py-3 rounded-xl bg-warning/10 border border-warning/20 text-warning text-[10px] font-mono font-bold uppercase disabled:opacity-50"
                >
                  开火
                </button>
                <button
                  disabled={actionLoading || metrics?.fire === false}
                  onClick={() => handleControl('shutdown')}
                  className="px-4 py-3 rounded-xl bg-brand/10 border border-brand/20 text-brand text-[10px] font-mono font-bold uppercase disabled:opacity-50"
                >
                  关火
                </button>
                <button
                  disabled={actionLoading || metrics?.locked === true}
                  onClick={() => handleControl('lock_device')}
                  className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-[10px] font-mono font-bold uppercase disabled:opacity-50"
                >
                  锁定
                </button>
                <button
                  disabled={actionLoading || metrics?.locked === false}
                  onClick={() => handleControl('unlock_device')}
                  className="px-4 py-3 rounded-xl bg-success/10 border border-success/20 text-success text-[10px] font-mono font-bold uppercase disabled:opacity-50"
                >
                  解锁
                </button>
              </div>
            </div>

            <div className="glass-dark p-6 rounded-3xl border border-border-subtle">
              <h3 className="text-xs font-display font-bold text-text-primary tracking-widest uppercase mb-6 flex items-center">
                <ShieldAlert className="w-4 h-4 mr-2 text-danger" /> 最近告警
              </h3>
              <div className="space-y-4">
                {alerts.length > 0 ? alerts.map((alert) => (
                  <div key={alert.id} className="p-3 bg-white/5 rounded-xl border border-border-subtle flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-text-primary">{alert.title}</p>
                      <p className="text-[9px] font-mono text-text-secondary mt-1">{formatTime(alert.triggeredAt)}</p>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${alert.level === 'critical' ? 'bg-danger brand-glow' : 'bg-warning'}`} />
                  </div>
                )) : (
                  <div className="p-3 bg-white/5 rounded-xl border border-border-subtle text-[10px] font-mono text-text-secondary uppercase tracking-widest text-center">
                    暂无告警
                  </div>
                )}
              </div>
            </div>

            <div className="glass-dark p-6 rounded-3xl border border-border-subtle">
              <h3 className="text-xs font-display font-bold text-text-primary tracking-widest uppercase mb-6 flex items-center">
                <History className="w-4 h-4 mr-2 text-brand" /> 最近控制
              </h3>
              <div className="space-y-4">
                {commands.length > 0 ? commands.map((command) => (
                  <div key={command.id} className="p-3 bg-white/5 rounded-xl border border-border-subtle flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-text-primary">{command.commandType}</p>
                      <p className="text-[9px] font-mono text-text-secondary mt-1">由 {command.operatorName} 发起</p>
                    </div>
                    <p className="text-[9px] font-mono text-text-secondary">{formatTime(command.startedAt)}</p>
                  </div>
                )) : (
                  <div className="p-3 bg-white/5 rounded-xl border border-border-subtle text-[10px] font-mono text-text-secondary uppercase tracking-widest text-center">
                    暂无控制记录
                  </div>
                )}
              </div>
            </div>

            <div className="glass-dark p-6 rounded-3xl border border-border-subtle">
              <h3 className="text-xs font-display font-bold text-text-primary tracking-widest uppercase mb-6 flex items-center">
                <Users className="w-4 h-4 mr-2 text-success" /> 共享关系
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-border-subtle">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-brand" />
                    </div>
                    <p className="text-xs font-bold text-text-primary">{owner?.displayName || owner?.uid}</p>
                  </div>
                  <span className="text-[9px] font-mono text-text-secondary uppercase">主账号</span>
                </div>
                {detail?.sharedUsers.map((shareUser) => (
                  <div key={shareUser.uid} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-border-subtle">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-brand" />
                      </div>
                      <p className="text-xs font-bold text-text-primary">{shareUser.displayName}</p>
                    </div>
                    <span className="text-[9px] font-mono text-text-secondary uppercase">共享成员</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
