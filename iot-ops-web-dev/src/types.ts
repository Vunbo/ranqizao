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

export interface MallProductCard {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  unit: string;
  tag: string;
}

export interface MallSectionCard {
  id: string;
  title: string;
  badge: string;
  description: string;
  products: MallProductCard[];
  note: string;
}

export interface MallPagePayload {
  pageTitle: string;
  pageSubtitle: string;
  cards: MallSectionCard[];
}

export interface OpsMallPageVersion {
  id: string;
  title: string;
  versionType: 'draft' | 'published';
  payload: MallPagePayload;
  createdByName: string | null;
  updatedByName: string | null;
  publishedByName: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface OpsMallPageResponse {
  draft: OpsMallPageVersion | null;
  published: OpsMallPageVersion | null;
}

export interface MerchantPageCard {
  id: string;
  title: string;
  badge: string;
  items: string[];
  note: string;
}

export interface MerchantPageContact {
  title: string;
  phone: string;
  wechat: string;
  address: string;
  note: string;
}

export interface MerchantPagePayload {
  pageTitle: string;
  pageSubtitle: string;
  applyNotice: string;
  cards: MerchantPageCard[];
  contact: MerchantPageContact;
}

export interface OpsMerchantPageVersion {
  id: string;
  title: string;
  versionType: 'draft' | 'published';
  payload: MerchantPagePayload;
  createdByName: string | null;
  updatedByName: string | null;
  publishedByName: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface OpsMerchantPageResponse {
  draft: OpsMerchantPageVersion | null;
  published: OpsMerchantPageVersion | null;
}

export interface OpsMerchantApplicationItem {
  id: string;
  userPk: string;
  uid: string;
  userDisplayName: string;
  userPhone: string | null;
  userEmail: string | null;
  status: 'pending' | 'approved' | 'rejected';
  levelCode: 'operations_center' | 'district_agent';
  levelLabel: string;
  merchantName: string;
  contactName: string;
  contactPhone: string;
  region: string;
  address: string;
  note: string | null;
  snapshot: Record<string, any> | null;
  reviewComment: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpsMerchantProfileItem {
  id: string;
  applicationId: string;
  userPk: string;
  uid: string;
  userDisplayName: string;
  userPhone: string | null;
  userEmail: string | null;
  merchantName: string;
  contactName: string;
  contactPhone: string;
  levelCode: 'operations_center' | 'district_agent';
  levelLabel: string;
  status: 'active' | 'disabled';
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpsMerchantApplicationDetailResponse {
  application: OpsMerchantApplicationItem;
  profile: OpsMerchantProfileItem | null;
}
