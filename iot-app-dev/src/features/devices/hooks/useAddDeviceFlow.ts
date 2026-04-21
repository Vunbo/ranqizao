import { useEffect, useState } from 'react';
import { devicesApi } from '../../../shared/api/devices';
import { Device } from '../../../shared/types';

export type AddDeviceStep =
  | 'scan'
  | 'location'
  | 'wifi'
  | 'configuring'
  | 'naming'
  | 'success';

export function useAddDeviceFlow({
  isOpen,
  userId,
  showToast,
  existingDevices,
  onBound,
  onRefreshDevices,
}: {
  isOpen: boolean;
  userId?: string;
  showToast: (msg: string, type?: any) => void;
  existingDevices: Device[];
  onBound: () => void;
  onRefreshDevices: () => Promise<void>;
}) {
  const [step, setStep] = useState<AddDeviceStep>('scan');
  const [deviceName, setDeviceName] = useState('智能安全灶');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [configProgress, setConfigProgress] = useState(0);

  const resetFlow = () => {
    setStep('scan');
    setDeviceName('智能安全灶');
    setLoading(false);
    setLocation(null);
    setWifiSsid('');
    setWifiPassword('');
    setConfigProgress(0);
  };

  useEffect(() => {
    if (!isOpen) {
      resetFlow();
    }
  }, [isOpen]);

  const handleScan = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setStep('location');
    }, 1500);
  };

  const handleGetLocation = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLocation({ lat: 31.2304, lng: 121.4737 });
      setLoading(false);
      setStep('wifi');
      console.log('模拟定位成功：上海 (31.2304, 121.4737)');
    }, 1500);
  };

  const handleStartConfig = () => {
    if (!wifiSsid) {
      showToast('请输入 Wi-Fi 名称', 'error');
      return;
    }

    setStep('configuring');
    let progress = 0;
    const interval = window.setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        window.clearInterval(interval);
        window.setTimeout(() => setStep('naming'), 500);
      }
      setConfigProgress(progress);
    }, 400);
  };

  const handleBind = async () => {
    if (!userId) {
      return;
    }

    const isDuplicate = existingDevices.some(
      (device) => device.name.trim() === deviceName.trim()
    );
    if (isDuplicate) {
      showToast('设备名称已存在，请修改后重试', 'error');
      return;
    }

    setLoading(true);
    try {
      await devicesApi.create({
        name: deviceName.trim(),
        location: location
          ? {
              latitude: location.lat,
              longitude: location.lng,
              address: '自动获取的位置',
            }
          : undefined,
      });
      await onRefreshDevices();
      setStep('success');
    } catch (error) {
      console.error('Binding failed', error);
      showToast(error instanceof Error ? error.message : '设备绑定失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    onBound();
    resetFlow();
  };

  return {
    step,
    deviceName,
    loading,
    location,
    wifiSsid,
    wifiPassword,
    configProgress,
    setDeviceName,
    setWifiSsid,
    setWifiPassword,
    handleScan,
    handleGetLocation,
    handleStartConfig,
    handleBind,
    handleFinish,
  };
}
