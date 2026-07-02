import type { ReactNode } from 'react';
import {
  Cpu,
  History,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  Store,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AlertCenterPage } from '../features/alerts';
import { CommandAuditPage } from '../features/audits';
import { SystemConfigPage } from '../features/configs';
import { DashboardPage } from '../features/dashboard';
import { DeviceDetailPage, DeviceListPage } from '../features/devices';
import { MerchantManagementPage } from '../features/merchant';
import { UserManagementPage } from '../features/users';
import { Login } from '../features/login/Login';

export const OPS_ROUTES = {
  root: '/',
  login: '/login',
  dashboard: '/dashboard',
  devices: '/devices',
  deviceDetail: '/devices/:id',
  alerts: '/alerts',
  commands: '/commands',
  users: '/users',
  configs: '/configs',
  merchant: '/merchant',
} as const;

export interface AppRouteConfig {
  path: string;
  element: ReactNode;
  protected?: boolean;
}

export interface NavRouteConfig {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
}

export const APP_ROUTES: AppRouteConfig[] = [
  {
    path: OPS_ROUTES.login,
    element: <Login />,
  },
  {
    path: OPS_ROUTES.dashboard,
    element: <DashboardPage />,
    protected: true,
  },
  {
    path: OPS_ROUTES.devices,
    element: <DeviceListPage />,
    protected: true,
  },
  {
    path: OPS_ROUTES.deviceDetail,
    element: <DeviceDetailPage />,
    protected: true,
  },
  {
    path: OPS_ROUTES.alerts,
    element: <AlertCenterPage />,
    protected: true,
  },
  {
    path: OPS_ROUTES.commands,
    element: <CommandAuditPage />,
    protected: true,
  },
  {
    path: OPS_ROUTES.users,
    element: <UserManagementPage />,
    protected: true,
  },
  {
    path: OPS_ROUTES.configs,
    element: <SystemConfigPage />,
    protected: true,
  },
  {
    path: OPS_ROUTES.merchant,
    element: <MerchantManagementPage />,
    protected: true,
  },
];

export const OPS_NAV_ITEMS: NavRouteConfig[] = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard, path: OPS_ROUTES.dashboard },
  { id: 'devices', label: '设备管理', icon: Cpu, path: OPS_ROUTES.devices },
  { id: 'alerts', label: '告警中心', icon: ShieldAlert, path: OPS_ROUTES.alerts },
  { id: 'commands', label: '控制审计', icon: History, path: OPS_ROUTES.commands },
  { id: 'users', label: '用户与共享', icon: Users, path: OPS_ROUTES.users },
  { id: 'configs', label: '系统配置', icon: Settings, path: OPS_ROUTES.configs },
  { id: 'merchant', label: '推广 / 入驻', icon: Store, path: OPS_ROUTES.merchant },
];
