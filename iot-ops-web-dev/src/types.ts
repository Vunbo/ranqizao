export interface OpsAuthUser {
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
