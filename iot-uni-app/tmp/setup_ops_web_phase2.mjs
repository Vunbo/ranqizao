import fs from 'fs';
import path from 'path';

const webRoot = 'D:\\Desktop\\ranqizao\\iot-ops-web-dev';

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(relativePath, content) {
  const fullPath = path.join(webRoot, relativePath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content, 'utf8');
}

const apiTs = `import { buildApiUrl } from './runtime';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getStoredToken() {
  try {
    return localStorage.getItem('token') || '';
  } catch (_error) {
    return '';
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', \`Bearer \${token}\`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
  });

  const responseText = await response.text();
  const responseData = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    throw new ApiError(
      responseData?.message || \`请求失败 (\${response.status})\`,
      response.status
    );
  }

  return responseData as T;
}

export const api = {
  get<T>(path: string) {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string) {
    return request<T>(path, {
      method: 'DELETE',
    });
  },
};
`;

const typesTs = `export interface OpsAuthUser {
  adminId: string;
  username: string;
  displayName: string;
  role: 'super_admin' | 'ops_admin' | 'ops_viewer';
}

export interface OpsSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  alertDevices: number;
  todayNewDevices: number;
  activeAlerts: number;
}

export interface OpsMapItem {
  name: string;
  total: number;
  online: number;
  offline: number;
  alert: number;
}

export interface OpsDeviceItem {
  id: string;
  sn: string;
  name: string;
  model: string;
  ownerUid: string;
  ownerDisplayName: string;
  firmwareVersion: string;
  inventoryStatus: string;
  online: boolean;
  status: 'normal' | 'alert' | 'locked' | 'offline';
  fire: boolean;
  fireStatus: 'on' | 'off';
  fireLevel: number;
  temp: number;
  gas: number;
  smoke: number;
  flow: number;
  humanDetected: boolean;
  vibration: boolean;
  locked: boolean;
  valveStatus: string;
  lastHeartbeatAt: string | null;
  region: string;
  country: string;
  province: string;
  city: string;
  district: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpsDeviceDetailResponse {
  device: OpsDeviceItem;
  owner: {
    uid: string;
    displayName: string;
  };
  sharedUsers: Array<{
    uid: string;
    displayName: string;
  }>;
  homes: Array<{
    id: string;
    name: string;
  }>;
}

export interface OpsDeviceMetrics {
  temp: number;
  gas: number;
  smoke: number;
  flow: number;
  fireLevel: number;
  fire: boolean;
  valveStatus: string;
  humanDetected: boolean;
  vibration: boolean;
  locked: boolean;
  online: boolean;
  collectedAt: string;
}

export interface OpsDeviceCommand {
  id: string;
  commandType: string;
  operatorType: string;
  operatorName: string;
  status: string;
  failureReason: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface OpsDeviceAlert {
  id: string;
  type: string;
  level: string;
  status: string;
  title: string;
  message: string;
  triggeredAt: string;
  resolvedAt: string | null;
}

export interface OpsUserListItem {
  userId: string;
  uid: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  status: string;
  bindCount: number;
  shareCount: number;
  lastLoginAt: string | null;
}

export interface OpsShareItem {
  id: string;
  type: string;
  resourceId: string;
  resourceSn: string;
  resourceName: string;
  ownerUid: string;
  ownerDisplayName: string;
  sharedToUid: string;
  sharedToDisplayName: string;
  permissions: string[];
  expiry: string | null;
  createdAt: string;
}

export interface OpsUserDetailResponse {
  user: {
    userId: string;
    uid: string;
    displayName: string;
    phone: string | null;
    email: string | null;
    status: string;
    lastLoginAt: string | null;
    createdAt: string;
  };
  boundDevices: OpsDeviceItem[];
  sharedDevices: Array<{
    id: string;
    sn: string;
    name: string;
    model: string;
    ownerUid: string;
    ownerDisplayName: string;
    permissions: string[];
    createdAt: string;
  }>;
}

export interface OpsAlertListItem {
  id: string;
  deviceId: string;
  deviceSn: string;
  type: string;
  level: 'critical' | 'high' | 'normal';
  status: 'pending' | 'resolved' | 'false_positive';
  title: string;
  message: string;
  handlerName: string;
  triggeredAt: string;
  resolvedAt: string | null;
}

export interface OpsCommandAuditItem {
  id: string;
  deviceSn: string;
  operatorName: string;
  commandType: string;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  failureReason: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface OpsConfigItem {
  id: string;
  name: string;
  updatedAt: string;
  type: 'message' | 'alert' | 'risk';
  data: Record<string, any>;
}
`;

const alertCenterTsx = `import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  ThermometerSnowflake,
  Search,
  MoreHorizontal,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';
import type { OpsAlertListItem } from '../types';

const AlertBadge = ({ level }: { level: string }) => {
  const styles: Record<string, string> = {
    critical: 'bg-danger/10 text-danger border-danger/20 brand-glow',
    high: 'bg-warning/10 text-warning border-warning/20',
    normal: 'bg-brand/10 text-brand border-brand/20',
  };
  const labels: Record<string, string> = {
    critical: '紧急威胁',
    high: '高危风险',
    normal: '系统建议',
  };

  return (
    <span className={\`px-3 py-1 rounded-lg text-[9px] font-mono font-bold border uppercase tracking-widest \${styles[level] || styles.normal}\`}>
      {labels[level] || level}
    </span>
  );
};

function formatTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export const AlertCenter = () => {
  const [alerts, setAlerts] = useState<OpsAlertListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      query.set('page', '1');
      query.set('pageSize', '100');
      if (searchQuery) query.set('search', searchQuery);
      if (levelFilter) query.set('level', levelFilter);
      if (statusFilter) query.set('status', statusFilter);

      const result = await api.get<{ items: OpsAlertListItem[] }>(\`/ops/alerts?\${query.toString()}\`);
      setAlerts(result.items || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '告警列表加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAlerts();
  }, [searchQuery, levelFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      pending: alerts.filter((alert) => alert.status === 'pending').length,
      resolved: alerts.filter((alert) => alert.status === 'resolved').length,
      falsePositive: alerts.filter((alert) => alert.status === 'false_positive').length,
    };
  }, [alerts]);

  const handleResolve = async (id: string) => {
    await api.patch(\`/ops/alerts/\${id}/resolve\`, { comment: '运维中台人工确认处理' });
    await fetchAlerts();
  };

  const handleMarkAsFalsePositive = async (id: string) => {
    await api.patch(\`/ops/alerts/\${id}/false-positive\`, { comment: '运维中台标记为误报' });
    await fetchAlerts();
  };

  return (
    <div className="p-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-black text-text-primary tracking-widest uppercase">安全指挥中心</h2>
          <p className="text-text-secondary text-[10px] font-mono font-bold mt-1 tracking-[0.2em]">0.3S 实时事件响应协议</p>
        </div>
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="搜索设备 SN 或消息..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10 pr-4 py-2 bg-black/40 border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none w-64 transition-all"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
            className="px-4 py-2 bg-black/40 border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all appearance-none"
          >
            <option value="">所有等级</option>
            <option value="critical">紧急威胁</option>
            <option value="high">高危风险</option>
            <option value="normal">系统建议</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-4 py-2 bg-black/40 border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all appearance-none"
          >
            <option value="">所有状态</option>
            <option value="pending">待处理</option>
            <option value="resolved">已解决</option>
            <option value="false_positive">误报</option>
          </select>
          <button
            onClick={() => {
              setSearchQuery('');
              setLevelFilter('');
              setStatusFilter('');
            }}
            className="p-2 bg-white/5 border border-border-subtle rounded-xl text-text-secondary hover:bg-white/10 hover:text-text-primary transition-all"
            title="重置筛选"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-dark rounded-2xl border border-border-subtle p-5">
          <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-2">待处理</p>
          <p className="text-3xl font-display font-black text-warning">{stats.pending}</p>
        </div>
        <div className="glass-dark rounded-2xl border border-border-subtle p-5">
          <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-2">已解决</p>
          <p className="text-3xl font-display font-black text-success">{stats.resolved}</p>
        </div>
        <div className="glass-dark rounded-2xl border border-border-subtle p-5">
          <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-2">误报</p>
          <p className="text-3xl font-display font-black text-text-secondary">{stats.falsePositive}</p>
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
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">告警事件</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">等级/状态</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">发生时间</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">处理人</th>
              <th className="px-8 py-5 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                  正在加载告警数据...
                </td>
              </tr>
            ) : alerts.length > 0 ? alerts.map((alert) => (
              <tr key={alert.id} className={\`hover:bg-brand/5 transition-all group cursor-pointer \${alert.status === 'pending' ? '' : 'opacity-60'}\`}>
                <td className="px-8 py-6">
                  <div className="flex items-start">
                    <div className={\`p-3 rounded-xl border mr-4 \${alert.level === 'critical' ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-warning/10 border-warning/20 text-warning'}\`}>
                      {alert.type === 'gas_leak' ? <AlertOctagon className="w-5 h-5" /> : <ThermometerSnowflake className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-mono text-sm font-bold text-text-primary tracking-tight">{alert.deviceSn}</p>
                      <p className="text-[10px] text-text-secondary mt-1">{alert.message}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col space-y-2">
                    <AlertBadge level={alert.level} />
                    <span className={\`text-[9px] font-mono font-bold uppercase \${alert.status === 'pending' ? 'text-warning' : alert.status === 'resolved' ? 'text-success' : 'text-text-secondary'}\`}>
                      {alert.status === 'pending' ? '待处理' : alert.status === 'resolved' ? '已解决' : '误报'}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-[10px] font-mono text-text-secondary">{formatTime(alert.triggeredAt)}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-[10px] font-mono text-text-secondary">{alert.handlerName}</p>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-all">
                    {alert.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="px-3 py-1.5 bg-brand/10 border border-brand/20 text-brand rounded-lg text-[9px] font-mono font-bold hover:bg-brand hover:text-black transition-all uppercase"
                        >
                          处理
                        </button>
                        <button
                          onClick={() => handleMarkAsFalsePositive(alert.id)}
                          title="标记为误报"
                          className="p-2 bg-white/5 border border-border-subtle text-text-secondary hover:text-danger hover:border-danger/40 rounded-lg transition-all"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button className="p-2 bg-white/5 border border-border-subtle text-text-secondary hover:text-text-primary rounded-lg transition-all">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <ShieldAlert className="w-12 h-12 text-text-secondary opacity-20" />
                    <p className="text-text-secondary text-sm font-mono">未发现符合条件的告警记录</p>
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
`;

const commandAuditTsx = `import React, { useEffect, useMemo, useState } from 'react';
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

      const result = await api.get<{ items: OpsCommandAuditItem[] }>(\`/ops/commands?\${query.toString()}\`);
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
`;

const systemConfigTsx = `import React, { useEffect, useMemo, useState } from 'react';
import {
  Settings,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Save,
  Plus,
  Trash2,
  Edit3,
  Play,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Mail,
  Zap,
  Clock,
  Search,
  X
} from 'lucide-react';
import { api } from '../lib/api';
import type { OpsConfigItem } from '../types';

type ConfigTab = 'message' | 'alert' | 'risk';

function formatTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function buildEmptyConfig(tab: ConfigTab): OpsConfigItem {
  const id = \`temp-\${Date.now()}\`;
  if (tab === 'message') {
    return {
      id,
      name: '新消息模板',
      updatedAt: new Date().toISOString(),
      type: 'message',
      data: {
        title: '新通知',
        content: '请输入内容...',
        channels: ['app'],
        variables: ['deviceId'],
        enabled: true,
      },
    };
  }

  if (tab === 'alert') {
    return {
      id,
      name: '新告警规则',
      updatedAt: new Date().toISOString(),
      type: 'alert',
      data: {
        condition: 'value > 0',
        severity: 'normal',
        actions: ['notify_user'],
        delay: 0,
        enabled: true,
      },
    };
  }

  return {
    id,
    name: '新风控规则',
    updatedAt: new Date().toISOString(),
    type: 'risk',
    data: {
      threshold: 'count > 5',
      action: 'notify_only',
      duration: 3600,
      reason: '默认说明',
      enabled: true,
    },
  };
}

function resolveConfigPath(tab: ConfigTab) {
  if (tab === 'message') return '/ops/configs/templates';
  if (tab === 'alert') return '/ops/configs/alert-rules';
  return '/ops/configs/risk-rules';
}

export const SystemConfig = () => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('message');
  const [configs, setConfigs] = useState<OpsConfigItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<OpsConfigItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  const [testInput, setTestInput] = useState('');
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tabConfigs = useMemo(() => configs.filter((config) => config.type === activeTab), [configs, activeTab]);

  const loadConfigs = async (tab: ConfigTab) => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get<{ items: OpsConfigItem[] }>(resolveConfigPath(tab));
      setConfigs(result.items || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '配置加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfigs(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (tabConfigs.length > 0) {
      const selected = tabConfigs.find((config) => config.id === selectedId) || tabConfigs[0];
      setSelectedId(selected.id);
      setDraft(JSON.parse(JSON.stringify(selected)));
    } else {
      setSelectedId(null);
      setDraft(null);
    }
  }, [tabConfigs, selectedId]);

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const path = resolveConfigPath(activeTab);
      const body = activeTab === 'message'
        ? {
            name: draft.name,
            title: draft.data.title,
            content: draft.data.content,
            channels: draft.data.channels || [],
            variables: draft.data.variables || [],
            enabled: draft.data.enabled !== false,
          }
        : activeTab === 'alert'
          ? {
              name: draft.name,
              severity: draft.data.severity,
              condition: draft.data.condition,
              actions: draft.data.actions || [],
              delay: Number(draft.data.delay || 0),
              enabled: draft.data.enabled !== false,
            }
          : {
              name: draft.name,
              threshold: draft.data.threshold,
              action: draft.data.action,
              duration: Number(draft.data.duration || 0),
              reason: draft.data.reason,
              enabled: draft.data.enabled !== false,
            };

      if (draft.id.startsWith('temp-')) {
        await api.post(path, body);
      } else {
        await api.put(\`\${path}/\${draft.id}\`, body);
      }

      await loadConfigs(activeTab);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '配置保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setIdToDelete(id);
  };

  const confirmDelete = async () => {
    if (!idToDelete) {
      return;
    }

    try {
      if (!idToDelete.startsWith('temp-')) {
        await api.delete(\`\${resolveConfigPath(activeTab)}/\${idToDelete}\`);
      }
      setConfigs((prev) => prev.filter((config) => config.id !== idToDelete));
      if (selectedId === idToDelete) {
        setSelectedId(null);
      }
      setIdToDelete(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '配置删除失败');
    }
  };

  const handleAdd = () => {
    const newConfig = buildEmptyConfig(activeTab);
    setConfigs((prev) => [newConfig, ...prev.filter((config) => !config.id.startsWith('temp-'))]);
    setSelectedId(newConfig.id);
    setDraft(JSON.parse(JSON.stringify(newConfig)));
  };

  const handleRunSimulation = async () => {
    if (!testInput || !draft || draft.id.startsWith('temp-')) {
      setError('请先保存配置，再输入测试设备 SN 或手机号后运行模拟');
      return;
    }

    setIsSimulating(true);
    setSimulationLog([]);
    setError('');

    try {
      const result = await api.post<{ logs: string[] }>('/ops/configs/simulate', {
        type: activeTab,
        configId: draft.id,
        target: testInput,
      });
      setSimulationLog(result.logs || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '模拟运行失败');
    } finally {
      setIsSimulating(false);
    }
  };

  const updateDraft = (updater: (prev: OpsConfigItem) => OpsConfigItem) => {
    setDraft((prev) => (prev ? updater(prev) : prev));
  };

  const renderEditor = () => {
    if (!draft || draft.type !== activeTab) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-text-secondary opacity-40">
          <Settings className="w-16 h-16 mb-4" />
          <p className="text-sm font-mono uppercase tracking-widest">请选择当前分类下的规则进行编辑</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'message':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">模板名称</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) => updateDraft((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">通知标题</label>
                <input
                  type="text"
                  value={draft.data.title || ''}
                  onChange={(event) => updateDraft((prev) => ({ ...prev, data: { ...prev.data, title: event.target.value } }))}
                  className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">通知内容</label>
              <textarea
                rows={4}
                value={draft.data.content || ''}
                onChange={(event) => updateDraft((prev) => ({ ...prev, data: { ...prev.data, content: event.target.value } }))}
                className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">推送渠道</label>
              <div className="flex space-x-4">
                {[
                  { id: 'sms', label: '短信', icon: MessageSquare },
                  { id: 'app', label: 'APP 推送', icon: Smartphone },
                  { id: 'mail', label: '邮件', icon: Mail },
                ].map((channel) => (
                  <label key={channel.id} className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={(draft.data.channels || []).includes(channel.id)}
                      onChange={(event) => {
                        updateDraft((prev) => ({
                          ...prev,
                          data: {
                            ...prev.data,
                            channels: event.target.checked
                              ? [...(prev.data.channels || []), channel.id]
                              : (prev.data.channels || []).filter((value: string) => value !== channel.id),
                          },
                        }));
                      }}
                      className="w-4 h-4 rounded border-border-subtle bg-black/40 text-brand focus:ring-brand"
                    />
                    <channel.icon className="w-3.5 h-3.5 text-text-secondary group-hover:text-brand transition-colors" />
                    <span className="text-[10px] font-mono font-bold text-text-secondary group-hover:text-text-primary uppercase">{channel.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      case 'alert':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">规则名称</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) => updateDraft((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">告警等级</label>
                <select
                  value={draft.data.severity || 'normal'}
                  onChange={(event) => updateDraft((prev) => ({ ...prev, data: { ...prev.data, severity: event.target.value } }))}
                  className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all appearance-none"
                >
                  <option value="critical">紧急 (CRITICAL)</option>
                  <option value="high">高危 (HIGH)</option>
                  <option value="normal">普通 (NORMAL)</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">触发逻辑 (DSL)</label>
              <div className="relative">
                <textarea
                  rows={3}
                  value={draft.data.condition || ''}
                  onChange={(event) => updateDraft((prev) => ({ ...prev, data: { ...prev.data, condition: event.target.value } }))}
                  className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-xs font-mono text-brand focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all resize-none"
                />
                <Zap className="absolute right-4 top-4 w-4 h-4 text-brand/30" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">联动响应</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'close_valve', label: '自动关阀' },
                  { id: 'cut_fire', label: '切断火力' },
                  { id: 'notify_user', label: '通知用户' },
                  { id: 'notify_admin', label: '通知管理员' },
                ].map((action) => (
                  <div key={action.id} className="flex items-center space-x-3 p-3 bg-white/5 border border-border-subtle rounded-xl">
                    <input
                      type="checkbox"
                      checked={(draft.data.actions || []).includes(action.id)}
                      onChange={(event) => {
                        updateDraft((prev) => ({
                          ...prev,
                          data: {
                            ...prev.data,
                            actions: event.target.checked
                              ? [...(prev.data.actions || []), action.id]
                              : (prev.data.actions || []).filter((value: string) => value !== action.id),
                          },
                        }));
                      }}
                      className="w-4 h-4 rounded border-border-subtle bg-black/40 text-brand focus:ring-brand"
                    />
                    <span className="text-[10px] font-mono font-bold text-text-secondary uppercase">{action.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">风控策略名称</label>
              <input
                type="text"
                value={draft.name}
                onChange={(event) => updateDraft((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">风险阈值</label>
                <input
                  type="text"
                  value={draft.data.threshold || ''}
                  onChange={(event) => updateDraft((prev) => ({ ...prev, data: { ...prev.data, threshold: event.target.value } }))}
                  className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-xs font-mono text-brand focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">执行动作</label>
                <select
                  value={draft.data.action || 'notify_only'}
                  onChange={(event) => updateDraft((prev) => ({ ...prev, data: { ...prev.data, action: event.target.value } }))}
                  className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all appearance-none"
                >
                  <option value="lock_device">锁定设备</option>
                  <option value="notify_only">仅通知</option>
                  <option value="limit_function">功能受限</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">策略说明</label>
              <textarea
                rows={3}
                value={draft.data.reason || ''}
                onChange={(event) => updateDraft((prev) => ({ ...prev, data: { ...prev.data, reason: event.target.value } }))}
                className="w-full px-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all resize-none"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-black text-text-primary tracking-widest uppercase">系统配置</h2>
          <p className="text-text-secondary text-[10px] font-mono font-bold mt-1 tracking-[0.2em]">业务规则与自动化协议定义</p>
        </div>
        <div className="flex bg-black/40 p-1 rounded-xl border border-border-subtle">
          {[
            { id: 'message', label: '消息模板', icon: MessageSquare },
            { id: 'alert', label: '告警规则', icon: ShieldAlert },
            { id: 'risk', label: '风控规则', icon: ShieldCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ConfigTab)}
              className={\`px-6 py-2 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center space-x-2 \${activeTab === tab.id ? 'bg-brand text-black brand-glow' : 'text-text-secondary hover:text-text-primary'}\`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="glass-dark rounded-2xl border border-danger/30 bg-danger/5 p-4 text-[10px] font-mono text-danger uppercase tracking-widest">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">现有规则 ({tabConfigs.length})</h4>
            <button
              onClick={handleAdd}
              className="p-1.5 bg-brand/10 border border-brand/20 text-brand rounded-lg hover:bg-brand hover:text-black transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {loading ? (
              <div className="p-4 text-[10px] font-mono text-text-secondary uppercase tracking-widest">正在加载配置...</div>
            ) : tabConfigs.map((config) => (
              <div
                key={config.id}
                onClick={() => {
                  setSelectedId(config.id);
                  setDraft(JSON.parse(JSON.stringify(config)));
                }}
                className={\`p-4 rounded-2xl border transition-all cursor-pointer group relative \${selectedId === config.id ? 'bg-brand/5 border-brand/50 brand-glow' : 'glass-dark border-border-subtle hover:border-brand/30'}\`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={\`w-1.5 h-1.5 rounded-full \${activeTab === 'message' ? 'bg-brand' : activeTab === 'alert' ? 'bg-warning' : 'bg-success'}\`} />
                    <p className="text-xs font-bold text-text-primary truncate max-w-[150px]">{config.name}</p>
                  </div>
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(event) => handleDelete(config.id, event)}
                      className="p-1 hover:bg-danger/10 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-text-secondary hover:text-danger" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[9px] text-text-secondary font-mono uppercase tracking-tighter">{config.id}</p>
                  <p className="text-[9px] text-text-secondary font-mono">{formatTime(config.updatedAt).split(' ')[0]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 glass-dark rounded-3xl border border-border-subtle p-8 flex flex-col min-h-[600px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">
                  {selectedId ? '编辑配置协议' : '选择协议'}
                </h3>
                <p className="text-[9px] font-mono text-text-secondary uppercase tracking-widest">
                  {selectedId ? \`ID: \${selectedId}\` : '未选择任何项'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {showSuccess && (
                <div className="flex items-center space-x-2 text-success animate-in fade-in slide-in-from-right-4">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-mono font-bold uppercase">保存成功</span>
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={!selectedId || isSaving}
                className="px-6 py-2 bg-brand text-black rounded-xl font-mono font-bold text-[10px] brand-glow hover:bg-brand/80 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSaving ? '正在保存...' : '保存配置'}</span>
              </button>
            </div>
          </div>

          <div className="flex-1">
            {renderEditor()}
          </div>

          {selectedId && (
            <div className="mt-8 space-y-4">
              <div className="p-6 bg-white/5 rounded-2xl border border-border-subtle">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Play className="w-4 h-4 text-brand" />
                    <h4 className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">模拟测试环境</h4>
                  </div>
                  <span className="text-[9px] font-mono text-text-secondary uppercase tracking-widest">Sandbox Mode</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="输入测试设备 SN 或手机号..."
                      value={testInput}
                      onChange={(event) => setTestInput(event.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-black/40 border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary outline-none focus:border-brand/50 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleRunSimulation}
                    disabled={isSimulating}
                    className="px-6 py-2 border border-brand/50 text-brand rounded-xl text-[10px] font-mono font-bold hover:bg-brand/10 transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    {isSimulating ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>{isSimulating ? '模拟中...' : '运行模拟'}</span>
                  </button>
                </div>
              </div>

              {(simulationLog.length > 0 || isSimulating) && (
                <div className="p-4 bg-black/60 border border-border-subtle rounded-2xl font-mono text-[9px] space-y-1 max-h-40 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-2">
                  {simulationLog.map((log, index) => (
                    <div key={index} className={\`\${log.includes('成功') ? 'text-success' : log.includes('正在') ? 'text-brand' : 'text-text-secondary'}\`}>
                      {log}
                    </div>
                  ))}
                  {isSimulating && <div className="text-brand animate-pulse">_</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {idToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-dark border border-border-subtle w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-danger" />
                </div>
                <h3 className="text-lg font-display font-bold text-text-primary tracking-widest uppercase">确认删除</h3>
              </div>
              <button
                onClick={() => setIdToDelete(null)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-text-secondary hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed mb-8">
              您确定要删除配置协议 <span className="text-text-primary font-bold">"{configs.find((config) => config.id === idToDelete)?.name}"</span> 吗？此操作不可撤销。
            </p>

            <div className="flex space-x-4">
              <button
                onClick={() => setIdToDelete(null)}
                className="flex-1 px-6 py-3 rounded-xl border border-border-subtle text-[10px] font-mono font-bold text-text-secondary hover:bg-white/5 transition-all uppercase tracking-widest"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 rounded-xl bg-danger text-white text-[10px] font-mono font-bold hover:bg-danger/80 transition-all uppercase tracking-widest shadow-lg shadow-danger/20"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
`;

writeFile('src/lib/api.ts', apiTs);
writeFile('src/types.ts', typesTs);
writeFile('src/pages/AlertCenter.tsx', alertCenterTsx);
writeFile('src/pages/CommandAudit.tsx', commandAuditTsx);
writeFile('src/pages/SystemConfig.tsx', systemConfigTsx);

console.log('Ops web phase 2 frontend integration files generated successfully.');
