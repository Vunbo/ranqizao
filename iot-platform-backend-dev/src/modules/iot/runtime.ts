import type { InventoryCloudIdentity, ParsedRuntimeState } from './types';

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseIotTimestamp(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function normalizeCloudStatus(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function resolveInventoryNodeIdentifier(inventory: InventoryCloudIdentity) {
  return inventory.nodeId || inventory.imei || inventory.serialNumber;
}

export function deriveLegacyFireLevelFromGear(gear: unknown) {
  const numericGear = Number(gear);
  if (!Number.isFinite(numericGear)) {
    return null;
  }

  const clamped = Math.min(5, Math.max(1, Math.round(numericGear)));
  return clamped * 20;
}

export function deriveLegacyGearFromFireLevel(fireLevel: unknown) {
  const numericFireLevel = Number(fireLevel);
  if (!Number.isFinite(numericFireLevel)) {
    return null;
  }

  const normalized = Math.min(100, Math.max(1, Math.round(numericFireLevel)));
  return Math.min(5, Math.max(1, Math.round(normalized / 20)));
}

function buildParsedRuntimeState(input: {
  cloudStatus: string | null;
  serviceId: string;
  reportedProperties: Record<string, unknown>;
  desiredProperties?: Record<string, unknown>;
  reportedAt?: string | null;
  lastSeenAt?: string | null;
}) {
  const desiredProperties = input.desiredProperties || {};
  const runState = typeof input.reportedProperties.run_state === 'string'
    ? input.reportedProperties.run_state
    : null;
  const heatTemp = toNullableNumber(input.reportedProperties.heat_temp);
  const roomTemp = toNullableNumber(input.reportedProperties.room_temp);
  const fuelConsumption = toNullableNumber(input.reportedProperties.fuel_consumption);
  const errorCode = typeof input.reportedProperties.error === 'string'
    ? input.reportedProperties.error
    : null;
  const position = typeof input.reportedProperties.position === 'string'
    ? input.reportedProperties.position
    : null;
  const gear =
    input.reportedProperties.current_gear
    || desiredProperties.config_gear
    || input.reportedProperties.CONFIG_GO
    || desiredProperties.CONFIG_GO;
  const reportedAt = input.reportedAt || input.lastSeenAt || new Date().toISOString();
  const lastSeenAt = input.lastSeenAt || reportedAt;
  const isOn = runState
    ? ['PREHEAT', 'KEEP_WARM', 'RUNNING'].includes(runState)
    : null;

  const runtime: ParsedRuntimeState = {
    cloudStatus: input.cloudStatus,
    serviceId: input.serviceId,
    reportedProperties: input.reportedProperties,
    desiredProperties,
    summary: {
      cloudStatus: input.cloudStatus,
      runState,
      heatTemp,
      roomTemp,
      fuelConsumption,
      errorCode,
      position,
      updatedAt: lastSeenAt,
    },
    runState,
    heatTemp,
    roomTemp,
    fuelConsumption,
    errorCode,
    position,
    reportedAt,
    lastSeenAt,
    compatibility: {
      isOn,
      fireLevel: deriveLegacyFireLevelFromGear(gear),
      temp: heatTemp,
      flow: fuelConsumption,
    },
  };

  return runtime;
}

export function parseRuntimeFromShadow(input: {
  cloudStatus: string | null;
  shadowPayload: Record<string, unknown>;
  devicePayload: Record<string, unknown>;
  serviceId: string;
}) {
  const shadowItems = asArray<Record<string, unknown>>(
    input.shadowPayload.shadow
      || input.shadowPayload.device_shadow
      || input.shadowPayload.devices
  );
  const matchedService =
    shadowItems.find((item) => item.service_id === input.serviceId)
    || shadowItems[0]
    || {};
  const reportedWrapper = asRecord(matchedService.reported);
  const desiredWrapper = asRecord(matchedService.desired);
  const reportedProperties = asRecord(
    reportedWrapper.properties || matchedService.properties
  );
  const desiredProperties = asRecord(desiredWrapper.properties);
  const lastSeenAt =
    parseIotTimestamp(
      input.devicePayload.last_time
      || input.devicePayload.last_seen_time
      || input.devicePayload.connection_status_update_time
    )
    || parseIotTimestamp(reportedWrapper.event_time)
    || new Date().toISOString();
  const reportedAt = parseIotTimestamp(reportedWrapper.event_time) || lastSeenAt;

  return buildParsedRuntimeState({
    cloudStatus: input.cloudStatus,
    serviceId:
      typeof matchedService.service_id === 'string' && matchedService.service_id
        ? matchedService.service_id
        : input.serviceId,
    reportedProperties,
    desiredProperties,
    reportedAt,
    lastSeenAt,
  });
}

export function parseRuntimeFromPropertyReport(input: {
  cloudStatus: string | null;
  servicesPayload: unknown;
  serviceId: string;
  eventTime?: string | null;
  lastSeenAt?: string | null;
}) {
  const services = asArray<Record<string, unknown>>(input.servicesPayload);
  const matchedService =
    services.find((item) => item.service_id === input.serviceId)
    || services[0]
    || {};
  const properties = asRecord(matchedService.properties);
  const lastSeenAt =
    input.lastSeenAt
    || parseIotTimestamp(
      matchedService.event_time
      || matchedService.timestamp
      || input.eventTime
    )
    || new Date().toISOString();
  const reportedAt =
    parseIotTimestamp(matchedService.event_time || matchedService.timestamp || input.eventTime)
    || lastSeenAt;

  return buildParsedRuntimeState({
    cloudStatus: input.cloudStatus,
    serviceId:
      typeof matchedService.service_id === 'string' && matchedService.service_id
        ? matchedService.service_id
        : input.serviceId,
    reportedProperties: properties,
    desiredProperties: {},
    reportedAt,
    lastSeenAt,
  });
}

export function buildStatusOnlyRuntime(input: {
  cloudStatus: string | null;
  serviceId: string;
  existingRuntime?: ParsedRuntimeState | null;
  eventTime?: string | null;
}) {
  const reportedAt = parseIotTimestamp(input.eventTime) || new Date().toISOString();
  const existing = input.existingRuntime;

  return buildParsedRuntimeState({
    cloudStatus: input.cloudStatus,
    serviceId: existing?.serviceId || input.serviceId,
    reportedProperties: existing?.reportedProperties || {},
    desiredProperties: existing?.desiredProperties || {},
    reportedAt: existing?.reportedAt || reportedAt,
    lastSeenAt: reportedAt,
  });
}
