import { useEffect, useMemo, useState } from 'react';
import * as echarts from 'echarts';
import { dashboardApi, type OpsSummary } from '../../lib/api-dashboard';
import type { OpsDeviceItem } from '../../lib/api-devices';
import { api } from '../../lib/api';
import { DEFAULT_MAP_ZOOM, MAP_SOURCES, tryLoadMap } from './dashboard.map';
import type {
  DashboardDevice,
  DashboardFilters,
  DashboardModalState,
} from './dashboard.types';
import {
  buildLocationTree,
  buildRegionStatsLookup,
  calculateBounds,
  countDeviceStats,
  doesDeviceMatchSelectedRegion,
  mapDeviceToDashboard,
  normalizeProvinceName,
  normalizeRegionLabel,
  splitRegionPath,
} from './dashboard.utils';

const initialFilters: DashboardFilters = {
  country: '',
  province: '',
  city: '',
  status: '',
  online: '',
  search: '',
};

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

export function useDashboardController() {
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
  const [activeModal, setActiveModal] = useState<DashboardModalState>(null);
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);

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
        const summaryResponse = await dashboardApi.summary();
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

  function resetToChinaView() {
    setMapZoom(DEFAULT_MAP_ZOOM);
    setSelectedRegion(null);
    setCurrentMapName('china');
  }

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

  return {
    summary,
    loading,
    error,
    mapLoaded,
    mapError,
    mapZoom,
    selectedRegion,
    currentMapName,
    isDrilling,
    isLight,
    activeModal,
    filters,
    deviceData,
    locationTree,
    filteredDevices,
    currentStats,
    onlineRate,
    statusOptions,
    onlineOptions,
    mapOption,
    initialFilters,
    setActiveModal,
    setFilters,
    setRefreshKey,
    resetToChinaView,
    handleMapFocus,
    onChartClick,
  };
}
