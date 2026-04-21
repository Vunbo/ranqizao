import { useEffect, useRef, useState } from 'react';
import { homesApi } from '../../../shared/api/homes';
import { FirebaseUser, Home } from '../../../shared/types';

export function useUserHomes(user: FirebaseUser | null) {
  const [homes, setHomes] = useState<Home[]>([]);
  const mountedRef = useRef(true);

  const refreshHomes = async () => {
    if (!user) {
      if (mountedRef.current) {
        setHomes([]);
      }
      return;
    }

    try {
      const nextHomes = await homesApi.list();
      if (mountedRef.current) {
        setHomes(nextHomes);
      }
    } catch (error) {
      console.error('Failed to load homes:', error);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    void refreshHomes();
    const interval = window.setInterval(() => {
      void refreshHomes();
    }, 3000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
    };
  }, [user]);

  return { homes, refreshHomes };
}
