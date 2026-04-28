import React, { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import {
  Activity,
  ShieldAlert,
  Zap,
  Search,
  ChevronRight,
  ChevronLeft,
  MapPin,
  RefreshCw,
  ChevronDown,
  Check,
  ShieldCheck,
  Wifi,
  Flame,
  Lock,
  Clock,
  Users,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { api } from '../lib/api';
import type { OpsDeviceItem, OpsSummary } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MAP_SOURCES = ['/maps/china.json', 'maps/china.json', './maps/china.json'];
const DEFAULT_MAP_ZOOM = { center: [104.114129, 37.550339] as [number, number], zoom: 1.2 };

type LocationTreeNode = {
  label: string;
  children: Array<{
    label: string;
    children: string[];
  }>;
};

type DashboardDevice = {
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

type RegionStats = {
  name: string;
  total: number;
  online: number;
  offline: number;
  alert: number;
};

function formatTime(value: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

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
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`;
  return date.toLocaleString();
}

function normalizeProvinceName(value: string) {
  return String(value || '')
    .trim()
    .replace(/(省|市|自治区|特别行政区|回族自治区|壮族自治区|维吾尔自治区)$/u, '');
}

function normalizeCityName(value: string) {
  return String(value || '')
    .trim()
    .replace(/(市|地区|自治州|盟)$/u, '');
}

function normalizeRegionLabel(value: string) {
  return normalizeCityName(normalizeProvinceName(value))
    .replace(/(区|县)$/u, '');
}

function splitRegionPath(region: string) {
  return String(region || '')
    .split(/\s*\/\s*|路/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function calculateBounds(features: any[]) {
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

function buildLocationTree(devices: DashboardDevice[]): LocationTreeNode[] {
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

function mapDeviceToDashboard(device: OpsDeviceItem): DashboardDevice {
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

function countDeviceStats(devices: DashboardDevice[]) {
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

function doesDeviceMatchSelectedRegion(
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

function buildRegionStatsLookup(devices: DashboardDevice[], currentMapName: string) {
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

async function loadGeoJson(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!data?.type) {
      throw new Error(`Invalid map payload from ${url}`);
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function tryLoadMap(urls: string[]) {
  let lastError = 'Unknown error';

  for (const url of urls) {
    try {
      return await loadGeoJson(url);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(lastError);
}

const Cascader = ({
  locationTree,
  value,
  onChange,
}: {
  locationTree: LocationTreeNode[];
  value: { country: string; province: string; city: string };
  onChange: (value: { country: string; province: string; city: string }) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCountry, setActiveCountry] = useState<string | null>(value.country || locationTree[0]?.label || null);
  const [activeProvince, setActiveProvince] = useState<string | null>(value.province || null);

  useEffect(() => {
    if (!activeCountry && locationTree[0]?.label) {
      setActiveCountry(locationTree[0].label);
    }
  }, [activeCountry, locationTree]);

  const displayValue = value.city
    ? `${value.country} / ${value.province} / ${value.city}`
    : value.province
      ? `${value.country} / ${value.province}`
      : value.country || '所有区域';

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
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>

            {activeCountry && (
              <div className="w-32 border-r border-border-subtle py-2 max-h-64 overflow-y-auto bg-black/10">
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
                    {province.children.length > 0 && <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
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
                      onChange({ country: activeCountry!, province: activeProvince, city });
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
  options: Array<{ label: string; value: string }>;
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-black/40 light:bg-black/[0.03] border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary hover:border-brand/50 transition-all min-w-[100px] justify-between"
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
  <div className="glass-dark p-6 rounded-2xl border border-border-subtle relative overflow-hidden group hover:border-brand/50 hover:brand-glow transition-all cursor-pointer hover:-translate-y-1 light:shadow-[0_4px_20px_rgba(0,0,0,0.03)] light:hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
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

export const Dashboard = () => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [summary, setSummary] = useState<OpsSummary | null>(null);
  const [devices, setDevices] = useState<OpsDeviceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [currentMapName, setCurrentMapName] = useState('china');
  const [isDrilling, setIsDrilling] = useState(false);
  const [isLight, setIsLight] = useState(document.documentElement.classList.contains('light'));
  const [activeModal, setActiveModal] = useState<{
    title: string;
    content?: string;
    type?: 'default' | 'device';
    device?: DashboardDevice;
  } | null>(null);

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
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.classList.contains('light'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadMap = async () => {
      setMapLoaded(false);
      setMapError(false);

      try {
        const data = await tryLoadMap(MAP_SOURCES);
        if (!isMounted) {
          return;
        }
        echarts.registerMap('china', data as never);
        setMapLoaded(true);
      } catch (_error) {
        if (isMounted) {
          setMapLoaded(false);
          setMapError(true);
        }
      }
    };

    void loadMap();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;

    const loadDevices = async () => {
      setLoading(true);
      setError('');

      try {
        const summaryResponse = await api.get<{ summary: OpsSummary }>('/ops/dashboard/summary');
        if (cancelled) {
          return;
        }

        const baseQuery = new URLSearchParams();
        if (filters.search) baseQuery.set('search', filters.search);
        if (filters.status) baseQuery.set('status', filters.status);
        if (filters.online) baseQuery.set('online', filters.online);
        if (filters.country) baseQuery.set('country', filters.country);
        if (filters.province) baseQuery.set('province', filters.province);
        if (filters.city) baseQuery.set('city', filters.city);

        const items: OpsDeviceItem[] = [];
        let page = 1;
        let total = Infinity;

        while (items.length < total) {
          const query = new URLSearchParams(baseQuery);
          query.set('page', String(page));
          query.set('pageSize', '100');

          const response = await api.get<{
            items: OpsDeviceItem[];
            pagination: { total: number };
          }>(`/ops/devices?${query.toString()}`);

          if (cancelled) {
            return;
          }

          items.push(...(response.items || []));
          total = response.pagination?.total ?? items.length;

          if (!response.items?.length) {
            break;
          }

          page += 1;
        }

        if (!cancelled) {
          setSummary(summaryResponse.summary);
          setDevices(items.slice(0, total));
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : '数据加载失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDevices();
    return () => {
      cancelled = true;
    };
  }, [filters, refreshKey]);

  const deviceData = useMemo(() => devices.map(mapDeviceToDashboard), [devices]);
  const locationTree = useMemo(() => buildLocationTree(deviceData), [deviceData]);

  const filteredDevices = useMemo(() => {
    return deviceData.filter((device) => {
      const searchValue = filters.search.trim().toLowerCase();
      const matchesSearch = !searchValue
        || device.sn.toLowerCase().includes(searchValue)
        || device.name.toLowerCase().includes(searchValue)
        || device.owner.toLowerCase().includes(searchValue);
      const matchesStatus = filters.status ? device.raw.status === filters.status : true;
      const matchesOnline = filters.online ? (filters.online === 'online' ? device.raw.online : !device.raw.online) : true;
      const matchesCountry = filters.country ? device.country === filters.country : true;
      const matchesProvince = filters.province ? device.province === filters.province : true;
      const matchesCity = filters.city ? device.city === filters.city : true;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesOnline &&
        matchesCountry &&
        matchesProvince &&
        matchesCity
      );
    });
  }, [deviceData, filters]);

  const regionStatsLookup = useMemo(
    () => buildRegionStatsLookup(deviceData, currentMapName),
    [deviceData, currentMapName]
  );

  const currentStats = useMemo(() => {
    if (!selectedRegion) {
      return {
        name: '全域总览',
        total: summary?.totalDevices || 0,
        online: summary?.onlineDevices || 0,
        offline: summary?.offlineDevices || 0,
        alert: summary?.alertDevices || 0,
      };
    }

    const matchedDevices = deviceData.filter((device) =>
      doesDeviceMatchSelectedRegion(device, selectedRegion, currentMapName)
    );
    const stats = countDeviceStats(matchedDevices);

    return {
      name: selectedRegion,
      total: stats.total,
      online: stats.online,
      offline: stats.offline,
      alert: stats.alert,
    };
  }, [currentMapName, deviceData, selectedRegion, summary]);

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

  const resolveProvinceFeature = (province: string) => {
    const chinaMapData = echarts.getMap('china');
    return chinaMapData?.geoJSON?.features?.find((feature: any) => {
      const rawName = String(feature?.properties?.name || '');
      return normalizeProvinceName(rawName) === normalizeProvinceName(province);
    });
  };

  const loadProvinceMap = async (province: string) => {
    const provinceFeature = resolveProvinceFeature(province);
    const adcode = String(provinceFeature?.properties?.adcode || '').trim();

    if (!adcode) {
      throw new Error(`无法找到省级地图编码: ${province}`);
    }

    const data = await tryLoadMap([
      `/maps/provinces/${adcode}.json`,
      `maps/provinces/${adcode}.json`,
      `./maps/provinces/${adcode}.json`,
    ]);

    const normalizedProvince = normalizeProvinceName(province);
    echarts.registerMap(normalizedProvince, data as never);
    setCurrentMapName(normalizedProvince);

    const bounds = calculateBounds(data.features);
    setMapZoom({
      center: bounds.center,
      zoom: 1,
    });

    return normalizedProvince;
  };

  const focusWithinMap = (target: string, mapName: string) => {
    const currentMapData = echarts.getMap(mapName);
    const normalizedTarget = normalizeRegionLabel(target);
    const feature = currentMapData?.geoJSON?.features?.find((item: any) => {
      const rawName = String(item?.properties?.name || '');
      return normalizeRegionLabel(rawName) === normalizedTarget;
    });

    if (!feature || !currentMapData?.geoJSON?.features) {
      return;
    }

    const targetBounds = calculateBounds([feature]);
    const mapBounds = calculateBounds(currentMapData.geoJSON.features);
    const zoomScale = Math.min(
      mapBounds.width / targetBounds.width,
      mapBounds.height / targetBounds.height
    ) * 0.9;

    setMapZoom({
      center: targetBounds.center,
      zoom: Math.max(zoomScale, 1),
    });

    return true;
  };

  const handleMapFocus = async (region: string) => {
    const parts = splitRegionPath(region);
    const country = parts[0] || '';
    const province = parts[1] || '';
    const city = parts[2] || '';
    const district = parts[3] || '';
    const target = district || city || province;
    const normalizedProvince = normalizeProvinceName(province);

    setFilters({
      ...initialFilters,
      country,
      province,
      city,
    });

    if (!target) {
      return;
    }

    if (province && currentMapName !== normalizedProvince) {
      setIsDrilling(true);
      try {
        const targetMapName = await loadProvinceMap(province);
        if (district || city) {
          setTimeout(() => {
            focusWithinMap(target, targetMapName);
          }, 100);
        }
      } catch (focusError) {
        console.error('Focus drill down error:', focusError);
      } finally {
        setIsDrilling(false);
      }
    } else {
      focusWithinMap(target, currentMapName);
    }

    setSelectedRegion(target);

    const mapElement = document.getElementById('global-distribution-map');
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const mapOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(13, 17, 23, 0.8)',
      borderColor: isLight ? 'rgba(88, 166, 255, 0.4)' : 'rgba(88, 166, 255, 0.2)',
      textStyle: {
        color: isLight ? '#1f2328' : '#f0f6fc',
        fontSize: 10,
        fontFamily: 'monospace',
      },
      formatter: (params: any) => {
        const rawName = String(params?.name || '');
        const stats = regionStatsLookup.get(normalizeRegionLabel(rawName));

        return `
          <div style="padding: 4px;">
            <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(88,166,255,0.2); padding-bottom: 4px;">${rawName} 运营矩阵</div>
            <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 4px;">
              <span style="color: #8b949e;">设备总数:</span>
              <span style="font-weight: bold;">${stats?.total || 0}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 4px;">
              <span style="color: #3fb950;">在线数量:</span>
              <span style="font-weight: bold; color: #3fb950;">${stats?.online || 0}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 4px;">
              <span style="color: #f85149;">离线数量:</span>
              <span style="font-weight: bold; color: #f85149;">${stats?.offline || 0}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 20px;">
              <span style="color: #d29922;">告警数量:</span>
              <span style="font-weight: bold; color: #d29922;">${stats?.alert || 0}</span>
            </div>
          </div>
        `;
      },
    },
    geo: {
      map: currentMapName,
      roam: true,
      center: mapZoom.center,
      zoom: mapZoom.zoom,
      layoutCenter: ['50%', '50%'],
      layoutSize: '95%',
      emphasis: {
        itemStyle: {
          areaColor: isLight ? 'rgba(88, 166, 255, 0.25)' : 'rgba(88, 166, 255, 0.3)',
        },
        label: {
          show: true,
          color: isLight ? '#1f2328' : '#f0f6fc',
          fontSize: 10,
        },
      },
      itemStyle: {
        areaColor: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.02)',
        borderColor: isLight ? 'rgba(88, 166, 255, 0.3)' : 'rgba(88, 166, 255, 0.1)',
        borderWidth: 1,
      },
      regions: selectedRegion
        ? [
            {
              name: selectedRegion,
              itemStyle: {
                areaColor: isLight ? 'rgba(9, 105, 218, 0.2)' : 'rgba(88, 166, 255, 0.2)',
                borderColor: isLight ? '#0969da' : '#58a6ff',
                borderWidth: 2,
                shadowColor: isLight ? 'rgba(9, 105, 218, 0.3)' : 'rgba(88, 166, 255, 0.4)',
                shadowBlur: 10,
              },
              label: {
                show: true,
                color: isLight ? '#0969da' : '#58a6ff',
                fontWeight: 'bold',
              },
            },
          ]
        : [],
    },
    series: [],
  }), [currentMapName, isLight, mapZoom, regionStatsLookup, selectedRegion]);

  const onChartClick = async (params: any) => {
    if ((params.componentType !== 'geo' && params.componentType !== 'series') || !params.name) {
      return;
    }

    setSelectedRegion(params.name);

    if (currentMapName === 'china') {
      const feature = resolveProvinceFeature(params.name);
      if (feature?.properties?.adcode) {
        setIsDrilling(true);
        try {
          await loadProvinceMap(params.name);
        } catch (error) {
          console.error('Drill down error:', error);
        } finally {
          setIsDrilling(false);
        }
        return;
      }
    }

    focusWithinMap(params.name, currentMapName);
  };

  return (
    <div className="p-10 space-y-10">
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div
            className={cn(
              'relative glass-dark border border-border-subtle rounded-3xl p-6 animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar',
              activeModal.type === 'device' ? 'max-w-lg w-full' : 'max-w-md w-full'
            )}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-display font-bold text-text-primary">{activeModal.title}</h3>
                {activeModal.type === 'device' && (
                  <p className="text-[9px] text-text-secondary font-mono mt-0.5 uppercase tracking-widest">
                    系统遥测数据实时同步中
                  </p>
                )}
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-text-secondary">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </button>
            </div>

            {activeModal.type === 'device' && activeModal.device ? (
              <div className="space-y-4">
                <div className="glass-dark p-4 rounded-2xl border border-border-subtle">
                  <h4 className="text-[9px] font-bold text-text-secondary uppercase tracking-widest flex items-center mb-4">
                    <ShieldCheck className="w-3 h-3 mr-2 text-brand" /> 基础信息
                  </h4>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-3">
                    {[
                      { label: '设备 SN', value: activeModal.device.sn },
                      { label: '设备名称', value: activeModal.device.name },
                      { label: '型号', value: activeModal.device.model },
                      { label: '固件版本', value: activeModal.device.version },
                      { label: '激活时间', value: activeModal.device.activationTime },
                      { label: '部署地址', value: activeModal.device.address },
                    ].map((item, index) => (
                      <div key={index} className={index === 5 ? 'col-span-2' : ''}>
                        <p className="text-[8px] font-mono text-text-secondary uppercase tracking-widest mb-0.5">{item.label}</p>
                        <p className="text-[11px] font-bold text-text-primary truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-dark p-4 rounded-2xl border border-border-subtle">
                  <h4 className="text-[9px] font-bold text-text-secondary uppercase tracking-widest flex items-center mb-4">
                    <Zap className="w-3 h-3 mr-2 text-warning" /> 最新状态
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: '在线状态', value: activeModal.device.online, icon: Wifi, color: activeModal.device.online === '在线' ? 'text-success' : 'text-danger' },
                      { label: '火焰状态', value: activeModal.device.fire ? '燃烧中' : '未点火', icon: Flame, color: activeModal.device.fire ? 'text-warning' : 'text-text-secondary' },
                      { label: '锁定状态', value: activeModal.device.locked ? '已锁定' : '未锁定', icon: Lock, color: activeModal.device.locked ? 'text-danger' : 'text-success' },
                      { label: '最后心跳', value: activeModal.device.time, icon: Clock, color: 'text-brand' },
                    ].map((item, index) => (
                      <div key={index} className="bg-white/5 p-2.5 rounded-xl border border-border-subtle">
                        <div className="flex items-center justify-between mb-1.5">
                          <item.icon className={`w-2.5 h-2.5 ${item.color}`} />
                          <span className="text-[7px] font-mono text-text-secondary uppercase">{item.label}</span>
                        </div>
                        <p className="text-[10px] font-bold text-text-primary">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: '核心温度', value: activeModal.device.metrics.temp },
                      { label: '燃气浓度', value: activeModal.device.metrics.gas },
                      { label: '流量', value: activeModal.device.metrics.flow },
                    ].map((item, index) => (
                      <div key={index} className="bg-white/5 p-2.5 rounded-xl border border-border-subtle">
                        <p className="text-[7px] font-mono text-text-secondary uppercase mb-0.5">{item.label}</p>
                        <p className="text-xs font-black text-text-primary">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-dark p-4 rounded-2xl border border-border-subtle">
                  <h4 className="text-[9px] font-bold text-text-secondary uppercase tracking-widest flex items-center mb-4">
                    <Users className="w-3 h-3 mr-2 text-success" /> 所属用户
                  </h4>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-border-subtle">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-brand" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-text-primary">{activeModal.device.owner}</p>
                        <p className="text-[9px] text-text-secondary font-mono mt-0.5">主账户权限</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[8px] font-bold uppercase">已认证</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="w-full py-3 bg-brand text-white rounded-xl text-xs font-bold hover:brand-glow transition-all shadow-lg shadow-brand/20"
                  >
                    关闭详情
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-text-secondary font-mono leading-relaxed mb-8 whitespace-pre-line">{activeModal.content}</p>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-3 bg-brand text-white rounded-xl text-xs font-bold hover:brand-glow transition-all"
                >
                  确定
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="设备总数" value={(summary?.totalDevices || 0).toLocaleString()} subText="在线设备总量" />
        <StatCard title="在线率" value={`${onlineRate}%`} subText="当前实时连接比例" />
        <StatCard title="告警总数" value={(summary?.activeAlerts || 0).toLocaleString()} subText="待处理安全事件" />
        <StatCard title="今日新增" value={`+${summary?.todayNewDevices || 0}`} subText="今日新绑定设备" />
      </div>

      {error && (
        <div className="glass-dark rounded-2xl border border-danger/30 bg-danger/5 p-4 text-[10px] font-mono text-danger uppercase tracking-widest">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div id="global-distribution-map" className="lg:col-span-3 glass-dark rounded-3xl overflow-hidden flex flex-col border border-border-subtle relative">
          <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-white/5 light:bg-black/[0.02]">
            <div>
              <h3 className="text-sm font-display font-bold text-text-primary tracking-widest uppercase">全球分布矩阵</h3>
              <p className="text-[10px] text-text-secondary font-mono mt-1">实时遥测中的 AI 燃烧同步</p>
            </div>
            <div className="flex space-x-2">
              {(selectedRegion || currentMapName !== 'china') && (
                <button
                  onClick={() => {
                    setMapZoom(DEFAULT_MAP_ZOOM);
                    setSelectedRegion(null);
                    setCurrentMapName('china');
                  }}
                  className="px-3 py-1 bg-brand/10 border border-brand/20 rounded-lg text-brand text-[10px] font-mono font-bold hover:bg-brand hover:text-white transition-all flex items-center space-x-1 animate-in fade-in slide-in-from-right-2"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>返回全域</span>
                </button>
              )}
              <button onClick={() => setRefreshKey((value) => value + 1)} className="p-2 hover:bg-white/5 rounded-lg transition-all text-text-secondary">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="h-[500px] relative bg-bg-main/20 flex items-center justify-center">
            {isDrilling && (
              <div className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin mb-3" />
                  <span className="text-[10px] font-mono text-brand uppercase tracking-widest">正在进入市级矩阵...</span>
                </div>
              </div>
            )}
            {mapLoaded ? (
              <ReactECharts
                echarts={echarts}
                option={mapOption}
                style={{ height: '100%', width: '100%' }}
                onEvents={{ click: onChartClick }}
                notMerge
                lazyUpdate
              />
            ) : mapError ? (
              <div className="text-center p-10 animate-in fade-in duration-500">
                <ShieldAlert className="w-12 h-12 text-danger mx-auto mb-4 opacity-50" />
                <p className="text-text-secondary font-mono text-xs mb-4">全球地理坐标同步失败</p>
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
                <p className="text-[8px] text-text-secondary/50 font-mono mt-2">尝试节点: {MAP_SOURCES.length} 个可用源</p>
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
                {selectedRegion ? '局部视图' : '全域视图'}
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

            <div className="mt-8 pt-6 border-t border-border-subtle">
              <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary mb-2">
                <span>在线率</span>
                <span>{currentStats.total > 0 ? ((currentStats.online / currentStats.total) * 100).toFixed(1) : '0.0'}%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand transition-all duration-1000"
                  style={{ width: `${currentStats.total > 0 ? (currentStats.online / currentStats.total) * 100 : 0}%` }}
                />
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
              <Cascader
                locationTree={locationTree}
                value={{ country: filters.country, province: filters.province, city: filters.city }}
                onChange={(value) => setFilters({ ...filters, ...value })}
              />

              <CustomSelect
                value={filters.online}
                onChange={(value) => setFilters({ ...filters, online: value })}
                placeholder="所有连接"
                options={onlineOptions}
              />

              <CustomSelect
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
                placeholder="所有状态"
                options={statusOptions}
              />

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="搜索 SN..."
                  value={filters.search}
                  onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                  className="pl-10 pr-4 py-2 bg-black/40 light:bg-black/[0.03] border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary focus:ring-1 focus:ring-brand focus:border-brand outline-none w-48 transition-all"
                />
              </div>

              <button
                onClick={() => setFilters(initialFilters)}
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
                    正在加载设备矩阵...
                  </td>
                </tr>
              ) : filteredDevices.length > 0 ? (
                filteredDevices.map((row) => (
                  <tr key={row.id} className="hover:bg-brand/5 transition-all group cursor-pointer border-b border-border-subtle last:border-0">
                    <td className="px-8 py-5 font-mono text-xs font-bold text-text-primary">{row.sn}</td>
                    <td className="px-8 py-5 text-[10px] font-mono text-text-secondary">{row.region}</td>
                    <td className="px-8 py-5 text-[10px] font-mono text-text-secondary">{row.model}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center">
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 brand-glow ${row.online === '在线' ? 'bg-success' : 'bg-danger'}`} />
                        <span className={`text-[10px] font-mono font-bold ${row.online === '在线' ? 'text-success' : 'text-danger'}`}>{row.online}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className={cn(
                          'px-3 py-1 rounded-lg text-[9px] font-mono font-bold border',
                          row.status === '正常' && 'bg-success/10 text-success border-success/20',
                          row.status === '告警' && 'bg-danger/10 text-danger border-danger/20',
                          row.status === '锁定' && 'bg-warning/10 text-warning border-warning/20',
                          row.status === '离线' && 'bg-white/5 text-text-secondary border-border-subtle'
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-[10px] font-mono text-text-secondary">{row.time}</td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-4">
                        <button
                          onClick={() => void handleMapFocus(row.region)}
                          className="text-[10px] font-mono font-bold text-brand hover:underline flex items-center space-x-1"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>聚焦</span>
                        </button>
                        <button
                          onClick={() =>
                            setActiveModal({
                              title: `设备详情 - ${row.sn}`,
                              type: 'device',
                              device: row,
                            })
                          }
                          className="text-[10px] font-mono font-bold text-text-secondary hover:text-text-primary transition-colors"
                        >
                          详情
                        </button>
                        <button
                          onClick={() =>
                            setActiveModal({
                              title: `审计日志 - ${row.sn}`,
                              content: `设备 ${row.sn} 的审计日志已迁移为后端接口模式。\n\n当前仪表盘页仅按原版布局保留入口，详细审计请进入命令审计或设备详情页查看。`,
                            })
                          }
                          className="text-[10px] font-mono font-bold text-text-secondary hover:text-text-primary transition-colors"
                        >
                          审计
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
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
