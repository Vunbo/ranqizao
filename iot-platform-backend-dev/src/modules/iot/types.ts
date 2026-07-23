export interface InventoryCloudIdentity {
  id: string;
  qrCode: string;
  serialNumber: string;
  productModel: string;
  firmwareVersion: string;
  status: 'available' | 'bound' | 'disabled';
  nodeId: string | null;
  imei: string | null;
  productCode: string | null;
  burnerCount: number | null;
}

export interface CloudRegistryRow {
  id: string;
  inventoryId: string;
  deviceId: string | null;
  provider: string;
  resourceSpaceId: string | null;
  productId: string | null;
  cloudDeviceId: string;
  nodeId: string | null;
  authType: string;
  provisionMode: string;
  provisionStatus: string;
  cloudDeviceName: string | null;
  activatedAt: string | null;
  lastSeenAt: string | null;
  lastSyncAt: string | null;
  meta: Record<string, unknown> | null;
}

export interface DeviceIotLinkRow {
  id: string;
  name: string;
  ownerId: string;
  inventoryId: string | null;
  serialNumber: string | null;
  legacyFireLevel: number;
  inventoryNodeId: string | null;
  inventoryImei: string | null;
  productCode: string | null;
  burnerCount: number | null;
  cloudRegistryId: string | null;
  cloudDeviceId: string | null;
  cloudNodeId: string | null;
  cloudStatus: string | null;
  resourceSpaceId: string | null;
  productId: string | null;
  serviceId: string | null;
  reportedProperties: Record<string, unknown> | null;
  desiredProperties: Record<string, unknown> | null;
  runtimeSummary: Record<string, unknown> | null;
  runtimeUpdatedAt: string | null;
}

export interface DeviceRuntimeStateRow {
  deviceId: string;
  cloudDeviceId: string;
  serviceId: string;
  cloudStatus: string | null;
  reportedProperties: Record<string, unknown>;
  desiredProperties: Record<string, unknown>;
  summary: Record<string, unknown>;
  runState: string | null;
  heatTemp: number | null;
  roomTemp: number | null;
  fuelConsumption: number | null;
  errorCode: string | null;
  position: string | null;
  reportedAt: string | null;
  lastSeenAt: string | null;
  updatedAt: string;
}

export interface HuaweiCloudDevice {
  device_id: string;
  node_id?: string;
  name?: string;
  app_id?: string;
  product_id?: string;
  status?: string;
  device_status?: string;
  create_time?: string;
  activated_time?: string;
  last_time?: string;
}

export interface ParsedRuntimeState {
  cloudStatus: string | null;
  serviceId: string;
  reportedProperties: Record<string, unknown>;
  desiredProperties: Record<string, unknown>;
  summary: Record<string, unknown>;
  runState: string | null;
  heatTemp: number | null;
  roomTemp: number | null;
  fuelConsumption: number | null;
  errorCode: string | null;
  position: string | null;
  reportedAt: string | null;
  lastSeenAt: string | null;
  compatibility: {
    isOn: boolean | null;
    fireLevel: number | null;
    temp: number | null;
    flow: number | null;
  };
}

export interface HuaweiIotCallbackEnvelope {
  resource: string;
  event: string;
  cloudDeviceId: string | null;
  nodeId: string | null;
  productId: string | null;
  resourceSpaceId: string | null;
  status: string | null;
  eventTime: string | null;
  servicesPayload: unknown;
  body: Record<string, unknown>;
  header: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
}
