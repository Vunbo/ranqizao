import type { OpsDeviceItem } from '../../types';
import type { DashboardDevice, LocationTreeNode, RegionStats } from './dashboard.types';

export function formatTime(value: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function formatRelativeTime(value: string | null) {
  if (!value) {
    return '未知';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`;
  return date.toLocaleString();
}

export function normalizeProvinceName(value: string) {
  return String(value || '')
    .trim()
    .replace(/(省|市|自治区|特别行政区|回族自治区|壮族自治区|维吾尔自治区)$/u, '');
}

export function normalizeCityName(value: string) {
  return String(value || '')
    .trim()
    .replace(/(市|地区|自治州|盟)$/u, '');
}

export function normalizeRegionLabel(value: string) {
  return normalizeCityName(normalizeProvinceName(value))
    .replace(/(区|县)$/u, '');
}

export function splitRegionPath(region: string) {
  return String(region || '')
    .split(/\s*\/\s*|路/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function calculateBounds(features: any[]) {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  const processCoords = (coords: any) => {
    if (!Array.isArray(coords)) {
      return;
    }

    if (typeof coords[0] === 'number') {
      const [lon, lat] = coords;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      return;
    }

    coords.forEach(processCoords);
  };

  features.forEach((feature) => {
    if (feature?.geometry?.coordinates) {
      processCoords(feature.geometry.coordinates);
    }
  });

  return {
    minLon,
    maxLon,
    minLat,
    maxLat,
    width: maxLon - minLon,
    height: maxLat - minLat,
    center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2] as [number, number],
  };
}

export function buildLocationTree(devices: DashboardDevice[]): LocationTreeNode[] {
  const countryMap = new Map<string, Map<string, Set<string>>>();

  devices.forEach((device) => {
    const country = device.country || '中国';
    const province = device.province || '未知区域';
    const city = device.city && device.city !== province ? device.city : '';

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
}

export function mapDeviceToDashboard(device: OpsDeviceItem): DashboardDevice {
  const regionParts = [device.country, device.province, device.city, device.district].filter(Boolean);

  return {
    id: device.id,
    sn: device.sn,
    name: device.name,
    region: device.region || regionParts.join(' / '),
    address: device.address || '-',
    model: device.model || '-',
    version: device.firmwareVersion || '-',
    activationTime: formatTime(device.createdAt),
    online: device.online ? '在线' : '离线',
    status:
      device.status === 'normal'
        ? '正常'
        : device.status === 'alert'
          ? '告警'
          : device.status === 'locked'
            ? '锁定'
            : '离线',
    time: formatRelativeTime(device.lastHeartbeatAt),
    owner: `${device.ownerDisplayName || '-'} (${device.ownerUid || '-'})`,
    fire: device.fire,
    locked: device.locked,
    country: device.country || '中国',
    province: device.province || '',
    city: device.city || '',
    district: device.district || '',
    raw: device,
    metrics: {
      temp: `${device.temp ?? 0}°C`,
      gas: `${device.gas ?? 0} %LEL`,
      flow: `${device.flow ?? 0} L/min`,
      smoke: `${device.smoke ?? 0}`,
      fireLevel: `${device.fireLevel ?? 0} 档`,
    },
  };
}

export function countDeviceStats(devices: DashboardDevice[]) {
  return devices.reduce(
    (acc, device) => {
      acc.total += 1;
      if (device.online === '在线') {
        acc.online += 1;
      } else {
        acc.offline += 1;
      }
      if (device.status === '告警') {
        acc.alert += 1;
      }
      return acc;
    },
    { total: 0, online: 0, offline: 0, alert: 0 }
  );
}

export function doesDeviceMatchSelectedRegion(
  device: DashboardDevice,
  selectedRegion: string,
  currentMapName: string
) {
  const normalizedSelected = normalizeRegionLabel(selectedRegion);

  if (!normalizedSelected) {
    return false;
  }

  if (currentMapName === 'china') {
    return normalizeProvinceName(device.province) === normalizedSelected;
  }

  const normalizedProvince = normalizeProvinceName(currentMapName);
  if (normalizeProvinceName(device.province) !== normalizedProvince) {
    return false;
  }

  return [
    device.city,
    device.district,
    device.province,
    ...splitRegionPath(device.region),
  ]
    .map((item) => normalizeRegionLabel(item))
    .includes(normalizedSelected);
}

export function buildRegionStatsLookup(devices: DashboardDevice[], currentMapName: string) {
  const statsMap = new Map<string, RegionStats>();

  const append = (name: string, device: DashboardDevice) => {
    const normalizedName = normalizeRegionLabel(name);
    if (!normalizedName) {
      return;
    }

    const current =
      statsMap.get(normalizedName) ||
      ({
        name,
        total: 0,
        online: 0,
        offline: 0,
        alert: 0,
      } satisfies RegionStats);

    current.total += 1;
    if (device.online === '在线') {
      current.online += 1;
    } else {
      current.offline += 1;
    }
    if (device.status === '告警') {
      current.alert += 1;
    }

    statsMap.set(normalizedName, current);
  };

  if (currentMapName === 'china') {
    devices.forEach((device) => append(device.province || device.city || device.country, device));
    return statsMap;
  }

  const normalizedProvince = normalizeProvinceName(currentMapName);
  devices
    .filter((device) => normalizeProvinceName(device.province) === normalizedProvince)
    .forEach((device) => {
      append(device.city || device.district || device.province, device);
      if (device.district) {
        append(device.district, device);
      }
    });

  return statsMap;
}
