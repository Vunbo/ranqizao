import type { OpsDeviceItem } from '../../types';

export type LocationTreeNode = {
  label: string;
  children: Array<{
    label: string;
    children: string[];
  }>;
};

export type DashboardDevice = {
  id: string;
  sn: string;
  name: string;
  region: string;
  address: string;
  model: string;
  version: string;
  activationTime: string;
  online: '在线' | '离线';
  status: '正常' | '告警' | '锁定' | '离线';
  time: string;
  owner: string;
  fire: boolean;
  locked: boolean;
  country: string;
  province: string;
  city: string;
  district: string;
  raw: OpsDeviceItem;
  metrics: {
    temp: string;
    gas: string;
    flow: string;
    smoke: string;
    fireLevel: string;
  };
};

export type RegionStats = {
  name: string;
  total: number;
  online: number;
  offline: number;
  alert: number;
};

export type DashboardFilters = {
  country: string;
  province: string;
  city: string;
  status: string;
  online: string;
  search: string;
};

export type DashboardModalState = {
  title: string;
  content?: string;
  type?: 'default' | 'device';
  device?: DashboardDevice;
} | null;
