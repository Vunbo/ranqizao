import { useEffect } from 'react';
import { devicesApi } from '../../../shared/api/devices';
import { Device, FirebaseUser } from '../../../shared/types';

export function useSelectedDeviceTelemetrySimulation(
  user: FirebaseUser | null,
  selectedDeviceId: string | null,
  devices: Device[]
) {
  useEffect(() => {
    if (!user || !selectedDeviceId) {
      return;
    }

    const selectedDevice = devices.find((device) => device.id === selectedDeviceId);
    if (!selectedDevice || !selectedDevice.isOn) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        await devicesApi.update(selectedDeviceId, {
          temp: Math.min(280, selectedDevice.temp + Math.random() * 5),
          gas: Number((0.05 + Math.random() * 0.02).toFixed(3)),
        });
      } catch (error) {
        console.error('Update failed', error);
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [devices, selectedDeviceId, user]);
}
