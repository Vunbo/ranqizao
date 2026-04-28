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

const runtimeTs = `type RuntimeImportMeta = ImportMeta & {
  env?: Record<string, string | boolean | undefined>;
};

export function getApiBaseUrl() {
  const runtimeImportMeta = import.meta as RuntimeImportMeta;
  const value = String(runtimeImportMeta.env?.VITE_API_BASE_URL || 'http://localhost:3001/api').trim();
  return value.replace(/\\/$/, '');
}

export function buildApiUrl(path: string) {
  return \`\${getApiBaseUrl()}\${path.startsWith('/') ? path : \`/\${path}\`}\`;
}
`;

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
`;

const loginTsx = `import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Lock, User, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import type { OpsAuthUser } from '../types';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await api.post<{ token: string; user: OpsAuthUser }>('/ops/auth/login', {
        username,
        password,
      });

      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-4 left-4 text-[8px] text-brand/20 font-mono uppercase tracking-widest z-50">系统入口 v2.0</div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md glass-dark p-10 rounded-3xl border border-border-subtle relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-brand/10 border border-brand/20 rounded-2xl flex items-center justify-center brand-glow mb-6">
            <Flame className="w-10 h-10 text-brand" />
          </div>
          <h1 className="text-2xl font-display font-black text-text-primary tracking-tighter uppercase">AI 安全灶</h1>
          <p className="text-[10px] text-brand font-mono uppercase tracking-[0.3em] mt-2">运维管理系统</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">用户名</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all"
                placeholder="请输入运维后台用户名"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest ml-1">密码</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-black/40 border border-border-subtle rounded-xl text-sm text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none transition-all"
                placeholder="请输入密码"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-[10px] font-mono font-bold text-danger text-center uppercase tracking-widest">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-brand text-black rounded-xl font-mono font-bold text-xs uppercase tracking-widest brand-glow hover:bg-brand/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>进入系统</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-border-subtle text-center">
          <p className="text-[9px] text-text-secondary font-mono uppercase tracking-widest">
            &copy; 2026 AI 安全灶运维中心. 保留所有权利.
          </p>
        </div>
      </div>

      <div className="hud-corner hud-corner-tl m-8" />
      <div className="hud-corner hud-corner-tr m-8" />
      <div className="hud-corner hud-corner-bl m-8" />
      <div className="hud-corner hud-corner-br m-8" />
    </div>
  );
};
`;

const layoutTsx = `import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Settings,
  ShieldAlert,
  Flame,
  ChevronRight,
  LogOut,
  Bell,
  Menu,
  User,
  Cpu,
  History,
  Users,
  Sun,
  Moon
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NavItemProps {
  key?: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavItem = ({ icon: Icon, label, active, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center w-full px-4 py-3 mb-1 transition-all duration-200 rounded-xl group text-sm',
      active
        ? 'bg-brand text-black font-bold brand-glow'
        : 'text-text-secondary hover:bg-white/5 light:hover:bg-black/[0.03] hover:text-text-primary'
    )}
  >
    <Icon className={cn('w-5 h-5 mr-3 transition-colors', active ? 'text-black' : 'text-text-secondary group-hover:text-brand')} />
    <span className="tracking-tight">{label}</span>
    {active && <ChevronRight className="w-4 h-4 ml-auto" />}
  </button>
);

function getRoleLabel(role: string) {
  if (role === 'super_admin') {
    return '超级管理员';
  }
  if (role === 'ops_admin') {
    return '运维管理员';
  }
  if (role === 'ops_viewer') {
    return '只读审计员';
  }
  if (role === 'admin') {
    return '超级管理员';
  }

  return role || '运维人员';
}

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLight, setIsLight] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const getUser = () => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : { displayName: '管理员', role: 'super_admin' };
    } catch (_error) {
      return { displayName: '管理员', role: 'super_admin' };
    }
  };
  const user = getUser();

  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLight]);

  const navItems = [
    { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'devices', label: '设备管理', icon: Cpu, path: '/devices' },
    { id: 'alerts', label: '告警中心', icon: ShieldAlert, path: '/alerts' },
    { id: 'commands', label: '控制审计', icon: History, path: '/commands' },
    { id: 'users', label: '用户与共享', icon: Users, path: '/users' },
    { id: 'configs', label: '系统配置', icon: Settings, path: '/configs' },
  ];

  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const alerts = [
    { id: 1, title: '设备离线告警', time: '实时', type: 'danger', msg: '可在告警中心查看完整处理链路' },
    { id: 2, title: '审计日志同步', time: '实时', type: 'warning', msg: '控制审计已切换到后台结构化数据' },
    { id: 3, title: '系统状态', time: '实时', type: 'success', msg: '运维中台已接入第一阶段后端接口' },
  ];

  return (
    <div className="flex h-screen bg-bg-main text-text-primary overflow-hidden font-sans selection:bg-brand/30 selection:text-brand transition-colors duration-300">
      <aside className={cn(
        'bg-bg-side border-r border-border-subtle flex flex-col z-40 relative transition-all duration-300',
        isSidebarOpen ? 'w-64' : 'w-20'
      )}>
        <div className="p-6 mb-4 relative">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center brand-glow shrink-0">
              <Flame className="w-6 h-6 text-brand" />
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden whitespace-nowrap">
                <h2 className="text-lg font-display font-black tracking-tighter uppercase">AI 安全灶</h2>
                <p className="text-[8px] text-brand font-mono uppercase tracking-[0.2em]">运维管理系统 2.0</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={isSidebarOpen ? item.label : ''}
              active={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-border-subtle">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-text-secondary hover:text-danger hover:bg-danger/5 light:hover:bg-danger/[0.03] rounded-xl transition-all group"
          >
            <LogOut className="w-5 h-5 mr-3 group-hover:text-danger" />
            {isSidebarOpen && <span className="text-sm font-bold">退出系统</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-bg-side/80 backdrop-blur-md flex items-center justify-between px-10 z-30 border-b border-border-subtle shadow-sm light:shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center space-x-8">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 light:hover:bg-black/[0.02] rounded-lg text-text-secondary transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-brand rounded-full brand-glow animate-pulse" />
              <h1 className="text-text-primary text-sm font-display font-bold tracking-widest uppercase">
                {navItems.find((item) => location.pathname.startsWith(item.path))?.label || '系统'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={() => setIsLight(!isLight)}
              className="p-2 hover:bg-white/5 light:hover:bg-black/[0.02] rounded-lg text-text-secondary hover:text-brand transition-all"
            >
              {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setIsAlertsOpen(!isAlertsOpen)}
                className={cn(
                  'relative p-2 transition-colors rounded-lg',
                  isAlertsOpen ? 'text-brand bg-white/5' : 'text-text-secondary hover:text-brand hover:bg-white/5'
                )}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-bg-side">3</span>
              </button>

              {isAlertsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsAlertsOpen(false)} />
                  <div className="absolute top-full mt-4 right-0 z-50 w-80 bg-bg-card border border-border-subtle rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-border-subtle bg-white/5 flex justify-between items-center">
                      <h3 className="text-xs font-bold text-text-primary tracking-widest uppercase">实时通知中心</h3>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {alerts.map((alert) => (
                        <div key={alert.id} className="p-4 border-b border-border-subtle last:border-0 hover:bg-white/5 transition-colors cursor-pointer group">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center space-x-2">
                              <div className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                alert.type === 'danger' ? 'bg-danger' : alert.type === 'warning' ? 'bg-warning' : 'bg-success'
                              )} />
                              <span className="text-[11px] font-bold text-text-primary group-hover:text-brand transition-colors">{alert.title}</span>
                            </div>
                            <span className="text-[9px] font-mono text-text-secondary">{alert.time}</span>
                          </div>
                          <p className="text-[10px] text-text-secondary leading-relaxed pl-3.5">{alert.msg}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="h-8 w-px bg-border-subtle" />

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-xs font-bold text-text-primary">{user.displayName || user.name}</p>
                <p className="text-[9px] text-brand font-mono uppercase tracking-widest">{getRoleLabel(user.role)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center brand-glow">
                <User className="w-6 h-6 text-brand" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-bg-main/50">
          {children}
        </div>

        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="hud-corner hud-corner-tl m-4 opacity-20" />
          <div className="hud-corner hud-corner-tr m-4 opacity-20" />
          <div className="hud-corner hud-corner-bl m-4 opacity-20" />
          <div className="hud-corner hud-corner-br m-4 opacity-20" />
        </div>
      </main>
    </div>
  );
};
`;

const dashboardTsx = `import React, { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import {
  Activity,
  ShieldAlert,
  Search,
  ChevronLeft,
  MapPin,
  RefreshCw,
  ChevronDown,
  Check,
  ShieldCheck,
  Flame,
  Lock,
  Clock,
  Users,
  Wifi,
  WifiOff
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { api } from '../lib/api';
import type { OpsDeviceItem, OpsMapItem, OpsSummary } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MAP_SOURCES = ['/maps/china.json', 'maps/china.json', './maps/china.json'];

const Cascader = ({
  devices,
  value,
  onChange,
}: {
  devices: OpsDeviceItem[];
  value: { country: string; province: string; city: string };
  onChange: (nextValue: { country: string; province: string; city: string }) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const locationTree = useMemo(() => {
    const countryMap = new Map<string, Map<string, Set<string>>>();

    devices.forEach((device) => {
      const country = device.country || '中国';
      const province = device.province || '未知区域';
      const city = device.city || '';

      if (!countryMap.has(country)) {
        countryMap.set(country, new Map());
      }

      const provinceMap = countryMap.get(country)!;
      if (!provinceMap.has(province)) {
        provinceMap.set(province, new Set());
      }

      if (city) {
        provinceMap.get(province)!.add(city);
      }
    });

    return Array.from(countryMap.entries()).map(([country, provinceMap]) => ({
      label: country,
      children: Array.from(provinceMap.entries()).map(([province, cities]) => ({
        label: province,
        children: Array.from(cities),
      })),
    }));
  }, [devices]);

  const [activeCountry, setActiveCountry] = useState<string | null>(value.country || locationTree[0]?.label || null);
  const [activeProvince, setActiveProvince] = useState<string | null>(value.province || null);

  const displayValue = value.city
    ? \`\${value.country} / \${value.province} / \${value.city}\`
    : value.province
      ? \`\${value.country} / \${value.province}\`
      : (value.country || '所有区域');

  const currentCountryData = locationTree.find((country) => country.label === activeCountry);
  const currentProvinceData = currentCountryData?.children.find((province) => province.label === activeProvince);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-black/40 light:bg-black/[0.03] border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary hover:border-brand/50 transition-all min-w-[180px] justify-between"
      >
        <div className="flex items-center space-x-2">
          <MapPin className="w-3 h-3 text-brand" />
          <span className="truncate max-w-[140px]">{displayValue}</span>
        </div>
        <ChevronDown className={cn('w-3 h-3 text-text-secondary transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-2 left-0 z-50 flex bg-bg-card border border-border-subtle rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-left">
            <div className="w-28 border-r border-border-subtle py-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  onChange({ country: '', province: '', city: '' });
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-[10px] font-mono hover:bg-brand/10 transition-colors',
                  !value.country ? 'text-brand bg-brand/5' : 'text-text-secondary'
                )}
              >
                所有区域
              </button>
              {locationTree.map((country) => (
                <button
                  key={country.label}
                  onMouseEnter={() => {
                    setActiveCountry(country.label);
                    setActiveProvince(null);
                  }}
                  onClick={() => {
                    onChange({ country: country.label, province: '', city: '' });
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full px-4 py-2 text-left text-[10px] font-mono hover:bg-brand/10 transition-colors flex items-center justify-between group',
                    activeCountry === country.label ? 'text-brand bg-brand/5' : 'text-text-secondary'
                  )}
                >
                  <span>{country.label}</span>
                  <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-100 -rotate-90" />
                </button>
              ))}
            </div>

            {activeCountry && (
              <div className="w-36 border-r border-border-subtle py-2 max-h-64 overflow-y-auto bg-black/10">
                {currentCountryData?.children.map((province) => (
                  <button
                    key={province.label}
                    onMouseEnter={() => setActiveProvince(province.label)}
                    onClick={() => {
                      if (province.children.length === 0) {
                        onChange({ country: activeCountry, province: province.label, city: '' });
                        setIsOpen(false);
                      }
                    }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-[10px] font-mono hover:bg-brand/10 transition-colors flex items-center justify-between group',
                      activeProvince === province.label ? 'text-brand bg-brand/5' : 'text-text-secondary'
                    )}
                  >
                    <span>{province.label}</span>
                    {province.children.length > 0 && <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-100 -rotate-90" />}
                  </button>
                ))}
              </div>
            )}

            {activeProvince && currentProvinceData && currentProvinceData.children.length > 0 && (
              <div className="w-32 py-2 max-h-64 overflow-y-auto bg-black/20">
                {currentProvinceData.children.map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      onChange({ country: activeCountry || '', province: activeProvince, city });
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-[10px] font-mono hover:bg-brand/10 transition-colors flex items-center justify-between',
                      value.city === city ? 'text-brand bg-brand/5' : 'text-text-secondary'
                    )}
                  >
                    <span>{city}</span>
                    {value.city === city && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-black/40 light:bg-black/[0.03] border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary hover:border-brand/50 transition-all min-w-[120px] justify-between"
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={cn('w-3 h-3 text-text-secondary transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-2 left-0 z-50 w-full bg-bg-card border border-border-subtle rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-left py-2">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-[10px] font-mono hover:bg-brand/10 transition-colors flex items-center justify-between',
                  value === option.value ? 'text-brand bg-brand/5' : 'text-text-secondary'
                )}
              >
                <span>{option.label}</span>
                {value === option.value && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({
  title,
  value,
  subText,
}: {
  title: string;
  value: string;
  subText: string;
}) => (
  <div className="glass-dark p-6 rounded-2xl border border-border-subtle relative overflow-hidden group hover:border-brand/50 hover:brand-glow transition-all cursor-default hover:-translate-y-1 light:shadow-[0_4px_20px_rgba(0,0,0,0.03)] light:hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Activity className="w-12 h-12 text-text-primary" />
    </div>
    <div className="relative">
      <p className="text-text-secondary text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-4">{title}</p>
      <div className="flex items-baseline space-x-2">
        <h3 className="text-3xl font-display font-black text-text-primary leading-none">{value}</h3>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[10px] text-text-secondary font-medium">{subText}</span>
        <div className="w-8 h-1 bg-white/5 light:bg-black/[0.03] rounded-full overflow-hidden">
          <div className="h-full bg-brand" style={{ width: '70%' }} />
        </div>
      </div>
    </div>
  </div>
);

function formatRelativeTime(value: string | null) {
  if (!value) {
    return '未知';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return \`\${Math.floor(diff / 60_000)}分钟前\`;
  if (diff < 86_400_000) return \`\${Math.floor(diff / 3_600_000)}小时前\`;
  return date.toLocaleString();
}

function parseProvinceFromRegion(region: string) {
  return region.split('·')[1] || region;
}

export const Dashboard = () => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [summary, setSummary] = useState<OpsSummary | null>(null);
  const [devices, setDevices] = useState<OpsDeviceItem[]>([]);
  const [mapItems, setMapItems] = useState<OpsMapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const initialFilters = {
    country: '',
    province: '',
    city: '',
    status: '',
    online: '',
    search: '',
  };
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    let isMounted = true;

    const loadMap = async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('地图资源加载失败');
      }
      return response.json();
    };

    const tryLoadMap = async () => {
      setMapError(false);
      for (const url of MAP_SOURCES) {
        try {
          const geoJson = await loadMap(url);
          if (!isMounted) return;
          echarts.registerMap('china', geoJson as never);
          setMapLoaded(true);
          return;
        } catch (_error) {}
      }
      if (isMounted) {
        setMapLoaded(false);
        setMapError(true);
      }
    };

    void tryLoadMap();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const query = new URLSearchParams();
        query.set('page', '1');
        query.set('pageSize', '200');
        if (filters.search) query.set('search', filters.search);
        if (filters.status) query.set('status', filters.status);
        if (filters.online) query.set('online', filters.online);
        if (filters.country) query.set('country', filters.country);
        if (filters.province) query.set('province', filters.province);
        if (filters.city) query.set('city', filters.city);

        const [summaryResponse, devicesResponse, mapResponse] = await Promise.all([
          api.get<{ summary: OpsSummary }>('/ops/dashboard/summary'),
          api.get<{ items: OpsDeviceItem[] }>(\`/ops/devices?\${query.toString()}\`),
          api.get<{ items: OpsMapItem[] }>('/ops/dashboard/map?level=province'),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        setSummary(summaryResponse.summary);
        setDevices(devicesResponse.items || []);
        setMapItems(mapResponse.items || []);
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
  }, [filters, refreshKey]);

  const currentStats = useMemo(() => {
    if (!summary) {
      return {
        name: '全境总览',
        total: 0,
        online: 0,
        offline: 0,
        alert: 0,
      };
    }

    if (!selectedProvince) {
      return {
        name: '全境总览',
        total: summary.totalDevices,
        online: summary.onlineDevices,
        offline: summary.offlineDevices,
        alert: summary.alertDevices,
      };
    }

    const matched = mapItems.find((item) => item.name === selectedProvince);
    return {
      name: selectedProvince,
      total: matched?.total || 0,
      online: matched?.online || 0,
      offline: matched?.offline || 0,
      alert: matched?.alert || 0,
    };
  }, [summary, mapItems, selectedProvince]);

  const locationDevices = useMemo(() => devices, [devices]);

  const mapOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(13,17,23,0.95)',
      borderColor: 'rgba(88,166,255,0.3)',
      textStyle: { color: '#f0f6fc' },
      formatter: (params: any) => {
        const item = mapItems.find((entry) => entry.name === params.name);
        if (!item) {
          return \`\${params.name}<br/>设备总数: 0\`;
        }

        return [
          \`<div style="font-weight:700;margin-bottom:6px;">\${item.name}</div>\`,
          \`设备总数: \${item.total}\`,
          \`在线设备: \${item.online}\`,
          \`离线设备: \${item.offline}\`,
          \`告警设备: \${item.alert}\`,
        ].join('<br/>');
      },
    },
    visualMap: {
      min: 0,
      max: Math.max(...mapItems.map((item) => item.total), 1),
      text: ['高', '低'],
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      inRange: {
        color: ['#1f2937', '#1d4ed8', '#58a6ff'],
      },
      textStyle: {
        color: '#8b949e',
      },
    },
    series: [
      {
        type: 'map',
        map: 'china',
        roam: true,
        zoom: 1.15,
        selectedMode: 'single',
        emphasis: {
          label: { color: '#f0f6fc' },
          itemStyle: {
            areaColor: '#58a6ff',
          },
        },
        itemStyle: {
          borderColor: 'rgba(240,246,252,0.12)',
          areaColor: '#111827',
        },
        data: mapItems.map((item) => ({
          name: item.name,
          value: item.total,
        })),
      },
    ],
  }), [mapItems]);

  const onlineRate = summary && summary.totalDevices > 0
    ? ((summary.onlineDevices / summary.totalDevices) * 100).toFixed(1)
    : '0.0';

  const statusOptions = [
    { label: '所有状态', value: '' },
    { label: '正常', value: 'normal' },
    { label: '告警', value: 'alert' },
    { label: '锁定', value: 'locked' },
    { label: '离线', value: 'offline' },
  ];

  const onlineOptions = [
    { label: '所有连接', value: '' },
    { label: '在线', value: 'online' },
    { label: '离线', value: 'offline' },
  ];

  const modelOptions: Array<{ label: string; value: string }> = [
    { label: '所有型号', value: '' },
    ...Array.from<string>(
      new Set<string>(
        devices
          .map((device) => device.model)
          .filter((model): model is string => Boolean(model))
      )
    ).map((model) => ({
      label: model,
      value: model,
    })),
  ];

  return (
    <div className="p-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-black text-text-primary tracking-widest uppercase">仪表盘</h2>
          <p className="text-text-secondary text-[10px] font-mono font-bold mt-1 tracking-[0.2em]">设备全局监控与区域统计</p>
        </div>
        <button
          onClick={() => setRefreshKey((value) => value + 1)}
          className="px-4 py-2 bg-white/5 border border-border-subtle rounded-xl text-[10px] font-mono font-bold text-text-secondary hover:text-brand hover:border-brand/50 transition-all flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>刷新数据</span>
        </button>
      </div>

      {error && (
        <div className="glass-dark rounded-2xl border border-danger/30 bg-danger/5 p-4 text-[10px] font-mono text-danger uppercase tracking-widest">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="设备总数" value={String(summary?.totalDevices || 0)} subText="全量已注册设备" />
        <StatCard title="在线率" value={\`\${onlineRate}%\`} subText="实时在线比例" />
        <StatCard title="告警总数" value={String(summary?.activeAlerts || 0)} subText="待处理安全事件" />
        <StatCard title="今日新增" value={\`+\${summary?.todayNewDevices || 0}\`} subText="今日注册设备" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 glass-dark rounded-3xl overflow-hidden flex flex-col border border-border-subtle relative">
          <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-white/5 light:bg-black/[0.02]">
            <div>
              <h3 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">全国设备分布</h3>
              <p className="text-[10px] text-text-secondary font-mono mt-1">基于设备位置聚合统计</p>
            </div>
            <div className="flex space-x-2">
              {selectedProvince && (
                <button
                  onClick={() => setSelectedProvince(null)}
                  className="px-3 py-1 bg-brand/10 border border-brand/20 rounded-lg text-brand text-[10px] font-mono font-bold hover:bg-brand hover:text-black transition-all flex items-center space-x-1"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>返回全境</span>
                </button>
              )}
            </div>
          </div>
          <div className="h-[500px] relative bg-bg-main/20 flex items-center justify-center">
            {mapLoaded ? (
              <ReactECharts
                echarts={echarts}
                option={mapOption}
                style={{ height: '100%', width: '100%' }}
                onEvents={{
                  click: (params: any) => {
                    if (params?.name) {
                      setSelectedProvince(params.name);
                    }
                  },
                }}
              />
            ) : mapError ? (
              <div className="text-center p-10 animate-in fade-in duration-500">
                <ShieldAlert className="w-12 h-12 text-danger mx-auto mb-4 opacity-50" />
                <p className="text-text-secondary font-mono text-xs mb-4">地图资源加载失败</p>
                <button
                  onClick={() => setRefreshKey((value) => value + 1)}
                  className="px-8 py-2 bg-brand/10 border border-brand/20 text-brand rounded-xl text-[10px] font-mono font-bold hover:bg-brand hover:text-black transition-all uppercase tracking-widest"
                >
                  重新初始化
                </button>
              </div>
            ) : (
              <div className="text-center animate-in fade-in duration-500">
                <div className="w-10 h-10 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-4" />
                <p className="text-text-secondary font-mono text-[10px] animate-pulse uppercase tracking-widest">正在建立地理数据隧道...</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass-dark rounded-3xl border border-border-subtle p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                <h3 className="text-xs font-display font-bold text-text-primary tracking-widest uppercase">区域详情</h3>
              </div>
              <span className="text-[10px] font-mono text-brand bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20">
                {selectedProvince ? '局部视图' : '全境视图'}
              </span>
            </div>

            <div className="mb-8">
              <p className="text-[10px] text-text-secondary font-mono uppercase tracking-tighter mb-1">当前选定区域</p>
              <h4 className="text-2xl font-display font-bold text-text-primary">{currentStats.name}</h4>
            </div>

            <div className="space-y-6 flex-1">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-[10px] text-text-secondary font-mono mb-2 uppercase">设备总数</p>
                <p className="text-xl font-display font-bold text-text-primary">{currentStats.total.toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-success/5 border border-success/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                    <span className="text-[10px] font-mono text-text-secondary">在线设备</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-success">{currentStats.online.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-danger/5 border border-danger/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-danger" />
                    <span className="text-[10px] font-mono text-text-secondary">离线设备</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-danger">{currentStats.offline.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-warning/5 border border-warning/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                    <span className="text-[10px] font-mono text-text-secondary">告警设备</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-warning">{currentStats.alert.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-dark rounded-3xl overflow-hidden border border-border-subtle">
        <div className="p-8 border-b border-border-subtle bg-white/5 light:bg-black/[0.02]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">设备实时状态列表</h3>
              <p className="text-[10px] text-text-secondary font-mono mt-1">实时同步全网设备运行矩阵</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Cascader devices={devices} value={{ country: filters.country, province: filters.province, city: filters.city }} onChange={(nextValue) => setFilters((prev) => ({ ...prev, ...nextValue }))} />
              <CustomSelect value={filters.online} onChange={(value) => setFilters((prev) => ({ ...prev, online: value }))} placeholder="所有连接" options={onlineOptions} />
              <CustomSelect value={filters.status} onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))} placeholder="所有状态" options={statusOptions} />
              <CustomSelect value={filters.model} onChange={(value) => setFilters((prev) => ({ ...prev, model: value }))} placeholder="所有型号" options={modelOptions} />

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="搜索 SN、名称、所有者..."
                  value={filters.search}
                  onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                  className="pl-10 pr-4 py-2 bg-black/40 light:bg-black/[0.03] border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none w-56 transition-all"
                />
              </div>

              <button
                onClick={() => {
                  setFilters(initialFilters);
                  setSelectedProvince(null);
                }}
                className="px-4 py-2 border border-border-subtle rounded-xl text-[10px] font-mono font-bold text-text-secondary hover:text-brand hover:border-brand/50 hover:bg-brand/5 transition-all flex items-center space-x-2"
              >
                <RefreshCw className="w-3 h-3" />
                <span>清空筛选</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 light:bg-black/[0.02] border-b border-border-subtle">
                <th className="px-8 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">设备 SN</th>
                <th className="px-8 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">区域</th>
                <th className="px-8 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">型号</th>
                <th className="px-8 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">在线状态</th>
                <th className="px-8 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">运行状态</th>
                <th className="px-8 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">最后心跳</th>
                <th className="px-8 py-4 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                    正在加载设备数据...
                  </td>
                </tr>
              ) : locationDevices.length > 0 ? locationDevices.map((row) => (
                <tr key={row.id} className="hover:bg-brand/5 transition-all group cursor-pointer border-b border-border-subtle last:border-0">
                  <td className="px-8 py-5 font-mono text-xs font-bold text-text-primary">{row.sn}</td>
                  <td className="px-8 py-5 text-[10px] font-mono text-text-secondary">{row.region}</td>
                  <td className="px-8 py-5 text-[10px] font-mono text-text-secondary">{row.model}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center">
                      {row.online ? <Wifi className="w-3.5 h-3.5 mr-2 text-success" /> : <WifiOff className="w-3.5 h-3.5 mr-2 text-danger" />}
                      <span className={cn('text-[10px] font-mono font-bold uppercase', row.online ? 'text-success' : 'text-danger')}>
                        {row.online ? '在线' : '离线'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        'px-3 py-1 rounded-lg text-[9px] font-mono font-bold border uppercase tracking-widest',
                        row.status === 'normal' && 'bg-success/10 text-success border-success/20',
                        row.status === 'alert' && 'bg-danger/10 text-danger border-danger/20',
                        row.status === 'locked' && 'bg-warning/10 text-warning border-warning/20',
                        row.status === 'offline' && 'bg-white/5 text-text-secondary border-border-subtle'
                      )}>
                        {row.status === 'normal' ? '正常' : row.status === 'alert' ? '告警' : row.status === 'locked' ? '锁定' : '离线'}
                      </span>
                      {row.fire && (
                        <span className="px-2 py-0.5 rounded bg-warning/10 text-warning text-[8px] font-mono font-bold border border-warning/20 uppercase">
                          燃烧中
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-[10px] font-mono text-text-secondary">{formatRelativeTime(row.lastHeartbeatAt)}</td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => setSelectedProvince(parseProvinceFromRegion(row.region))}
                        className="text-[10px] font-mono font-bold text-brand hover:underline flex items-center space-x-1"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>聚焦</span>
                      </button>
                      <button
                        onClick={() => window.location.assign(\`/devices/\${row.id}\`)}
                        className="text-[10px] font-mono font-bold text-text-secondary hover:text-text-primary transition-colors"
                      >
                        详情
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 opacity-50">
                      <ShieldCheck className="w-12 h-12 text-text-secondary" />
                      <p className="text-xs font-mono font-bold text-text-secondary uppercase tracking-widest">未找到匹配的设备</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
`;

const deviceListTsx = `import React, { useEffect, useMemo, useState } from 'react';
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
  if (diff < 3_600_000) return \`\${Math.floor(diff / 60_000)}分钟前\`;
  if (diff < 86_400_000) return \`\${Math.floor(diff / 3_600_000)}小时前\`;
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

        const result = await api.get<{ items: OpsDeviceItem[] }>(\`/ops/devices?\${query.toString()}\`);
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
              className={\`p-2 border rounded-xl transition-all flex items-center space-x-2 \${isFilterOpen ? 'bg-brand/10 border-brand text-brand' : 'bg-white/5 border-border-subtle text-text-secondary hover:bg-white/10 hover:text-text-primary'}\`}
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
                            className={\`px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold border transition-all \${statusFilter === item.value ? 'bg-brand text-black border-brand' : 'bg-white/5 border-border-subtle text-text-secondary hover:border-brand/50'}\`}
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
                          className={\`w-full px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold border text-left transition-all \${modelFilter === '' ? 'bg-brand text-black border-brand' : 'bg-white/5 border-border-subtle text-text-secondary hover:border-brand/50'}\`}
                        >
                          所有型号
                        </button>
                        {modelOptions.map((model) => (
                          <button
                            key={model}
                            onClick={() => setModelFilter(model)}
                            className={\`w-full px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold border text-left transition-all \${modelFilter === model ? 'bg-brand text-black border-brand' : 'bg-white/5 border-border-subtle text-text-secondary hover:border-brand/50'}\`}
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
                <td className="px-8 py-6" onClick={() => navigate(\`/devices/\${device.id}\`)}>
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-border-subtle flex items-center justify-center mr-4 group-hover:border-brand/30 transition-all">
                      <Flame className={\`w-6 h-6 \${device.online ? 'text-brand' : 'text-text-secondary'}\`} />
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
                      onClick={() => navigate(\`/devices/\${device.id}\`)}
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
`;

const deviceDetailTsx = `import React, { useEffect, useState } from 'react';
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
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }

    const controller = new AbortController();

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [detailResponse, metricsResponse, alertsResponse, commandsResponse] = await Promise.all([
          api.get<OpsDeviceDetailResponse>(\`/ops/devices/\${id}\`),
          api.get<{ metrics: OpsDeviceMetrics }>(\`/ops/devices/\${id}/metrics/realtime\`),
          api.get<{ items: OpsDeviceAlert[] }>(\`/ops/devices/\${id}/alerts\`),
          api.get<{ items: OpsDeviceCommand[] }>(\`/ops/devices/\${id}/commands\`),
        ]);

        if (controller.signal.aborted) return;

        setDetail(detailResponse);
        setMetrics(metricsResponse.metrics);
        setAlerts(alertsResponse.items || []);
        setCommands(commandsResponse.items || []);
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

    void loadData();
    return () => controller.abort();
  }, [id]);

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
                      <item.icon className={\`w-4 h-4 \${item.color}\`} />
                      <span className="text-[9px] font-mono text-text-secondary uppercase">{item.label}</span>
                    </div>
                    <p className="text-lg font-bold text-text-primary">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {[
                  { label: '火力档位', value: \`\${metrics?.fireLevel || 0} 档\`, sub: 'AI 智能调节' },
                  { label: '核心温度', value: \`\${metrics?.temp ?? 0} °C\`, sub: '实时遥测' },
                  { label: '燃气浓度', value: \`\${metrics?.gas ?? 0} %LEL\`, sub: metrics?.valveStatus || 'closed' },
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
                <ShieldAlert className="w-4 h-4 mr-2 text-danger" /> 最近告警
              </h3>
              <div className="space-y-4">
                {alerts.length > 0 ? alerts.map((alert) => (
                  <div key={alert.id} className="p-3 bg-white/5 rounded-xl border border-border-subtle flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-text-primary">{alert.title}</p>
                      <p className="text-[9px] font-mono text-text-secondary mt-1">{formatTime(alert.triggeredAt)}</p>
                    </div>
                    <span className={\`w-2 h-2 rounded-full \${alert.level === 'critical' ? 'bg-danger brand-glow' : 'bg-warning'}\`} />
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
`;

const userManagementTsx = `import React, { useEffect, useState } from 'react';
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
          const result = await api.get<{ items: OpsUserListItem[] }>(\`/ops/users?\${query.toString()}\`);
          if (!controller.signal.aborted) {
            setUsers(result.items || []);
          }
        } else {
          const query = new URLSearchParams();
          query.set('page', '1');
          query.set('pageSize', '100');
          if (searchQuery) query.set('search', searchQuery);
          const result = await api.get<{ items: OpsShareItem[] }>(\`/ops/shares?\${query.toString()}\`);
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
      const result = await api.get<OpsUserDetailResponse>(\`/ops/users/\${uid}\`);
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
              className={\`px-6 py-2 rounded-lg text-[10px] font-mono font-bold transition-all \${activeTab === 'users' ? 'bg-brand text-black brand-glow' : 'text-text-secondary hover:text-text-primary'}\`}
            >
              用户列表
            </button>
            <button
              onClick={() => {
                setActiveTab('shares');
                setSearchQuery('');
                setStatusFilter('');
              }}
              className={\`px-6 py-2 rounded-lg text-[10px] font-mono font-bold transition-all \${activeTab === 'shares' ? 'bg-brand text-black brand-glow' : 'text-text-secondary hover:text-text-primary'}\`}
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
                    <span className={\`px-3 py-1 rounded-lg text-[9px] font-mono font-bold border uppercase tracking-widest \${user.status === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-white/5 text-text-secondary border-border-subtle'}\`}>
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
                          <span className={\`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border \${device.status === 'normal' ? 'bg-success/10 text-success border-success/20' : device.status === 'alert' ? 'bg-danger/10 text-danger border-danger/20' : device.status === 'locked' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-white/5 text-text-secondary border-border-subtle'}\`}>
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
`;

const envExample = `# 运维中台前端接口地址
VITE_API_BASE_URL=http://localhost:3001/api

# 以下配置为 AI Studio 遗留变量，可忽略
GEMINI_API_KEY="MY_GEMINI_API_KEY"
APP_URL="MY_APP_URL"
`;

const readmePatch = `# iot-ops-web-dev

物联网燃气灶运维中台前端。

## 当前状态

- 已接入第一阶段运维后端接口：
  - \`/api/ops/auth/*\`
  - \`/api/ops/dashboard/*\`
  - \`/api/ops/devices/*\`
  - \`/api/ops/users/*\`
  - \`/api/ops/shares/*\`
- 告警中心、控制审计、系统配置页当前仍保留前端 mock 数据

## 环境配置

创建 \`.env\`：

\`\`\`env
VITE_API_BASE_URL=http://localhost:3001/api
\`\`\`

## 本地开发

\`\`\`bash
npm install
npm run dev
\`\`\`
`;

writeFile('src/lib/runtime.ts', runtimeTs);
writeFile('src/lib/api.ts', apiTs);
writeFile('src/types.ts', typesTs);
writeFile('src/pages/Login.tsx', loginTsx);
writeFile('src/components/Layout.tsx', layoutTsx);
writeFile('src/pages/Dashboard.tsx', dashboardTsx);
writeFile('src/pages/DeviceList.tsx', deviceListTsx);
writeFile('src/pages/DeviceDetail.tsx', deviceDetailTsx);
writeFile('src/pages/UserManagement.tsx', userManagementTsx);
writeFile('.env.example', envExample);
writeFile('README.md', readmePatch);

console.log('Ops web phase 1 frontend integration files generated successfully.');
