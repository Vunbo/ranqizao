import { useEffect, useMemo, useState } from 'react';
import { devicesApi } from '../../../shared/api/devices';
import { Device, FirebaseUser, OperationLog } from '../../../shared/types';

type SensorIconKey = 'gas' | 'smoke' | 'temp' | 'human' | 'vibration' | 'flow';
type SensorStatus = 'safe' | 'warning' | 'danger';

interface SensorMetric {
  id: string;
  label: string;
  value: string;
  status: SensorStatus;
  icon: SensorIconKey;
}

export function useSafetyMonitor(devices: Device[], user: FirebaseUser | null) {
  const shortUid = user?.uid?.slice(0, 8);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    devices[0]?.id || ''
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [alertLogs, setAlertLogs] = useState<
    { id: string; event: string; time: string; type: string }[]
  >([]);

  const device = devices.find((item) => item.id === selectedDeviceId) || devices[0];
  const myDevices = devices.filter((item) => item.ownerId === shortUid);
  const sharedDevices = devices.filter((item) => item.ownerId !== shortUid);

  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

  useEffect(() => {
    if (!device) {
      setLogs([]);
      return;
    }

    let cancelled = false;

    const loadLogs = async () => {
      try {
        const nextLogs = await devicesApi.listLogs(device.id);
        if (!cancelled) {
          setLogs(nextLogs);
        }
      } catch (error) {
        console.error('Failed to load logs:', error);
      }
    };

    void loadLogs();
    const interval = window.setInterval(() => {
      void loadLogs();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [device]);

  useEffect(() => {
    if (!device) {
      setAlertLogs([]);
      return;
    }

    setAlertLogs([
      {
        id: '1',
        time: '今天 08:30',
        event: '干烧预警：锅底温度过高',
        type: 'warning',
      },
      {
        id: '2',
        time: '昨天 12:15',
        event: '自动关阀：检测到无人看护',
        type: 'info',
      },
    ]);
  }, [device]);

  const sensors = useMemo<SensorMetric[]>(
    () =>
      device
        ? [
            {
              id: 'gas',
              label: '燃气监测',
              value: `${device.gas.toFixed(2)}% LEL`,
              status: device.gas > 20 ? 'warning' : 'safe',
              icon: 'gas',
            },
            {
              id: 'smoke',
              label: '烟雾监测',
              value: `${device.smoke}%`,
              status: device.smoke > 10 ? 'warning' : 'safe',
              icon: 'smoke',
            },
            {
              id: 'temp',
              label: '超温预警',
              value: `${device.temp.toFixed(1)}°C`,
              status: device.temp > 250 ? 'danger' : 'safe',
              icon: 'temp',
            },
            {
              id: 'human',
              label: '人体感应',
              value: device.humanDetected ? '有人' : '无人',
              status: 'safe',
              icon: 'human',
            },
            {
              id: 'vibration',
              label: '倾倒检测',
              value: device.vibration ? '异常' : '正常',
              status: device.vibration ? 'danger' : 'safe',
              icon: 'vibration',
            },
            {
              id: 'flow',
              label: '流量监控',
              value: `${device.flow} L/min`,
              status: 'safe',
              icon: 'flow',
            },
          ]
        : [],
    [device]
  );

  return {
    device,
    myDevices,
    sharedDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    isDropdownOpen,
    setIsDropdownOpen,
    logs,
    alertLogs,
    sensors,
  };
}
