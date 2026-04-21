import { useEffect, useRef, useState } from 'react';
import { devicesApi } from '../../../shared/api/devices';
import { Device, FirebaseUser } from '../../../shared/types';

export function useUserDevices(user: FirebaseUser | null) {
  const [devices, setDevices] = useState<Device[]>([]);
  const mountedRef = useRef(true);

  const refreshDevices = async () => {
    if (!user) {
      if (mountedRef.current) {
        setDevices([]);
      }
      return;
    }

    try {
      const nextDevices = await devicesApi.list();
      if (mountedRef.current) {
        setDevices(nextDevices);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    void refreshDevices();
    const interval = window.setInterval(() => {
      void refreshDevices();
    }, 3000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
    };
  }, [user]);

  return { devices, refreshDevices };
}
