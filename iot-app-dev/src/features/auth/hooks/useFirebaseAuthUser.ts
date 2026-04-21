import { useEffect, useState } from 'react';
import { authApi } from '../../../shared/api/auth';
import { FirebaseUser } from '../../../shared/types';

export function useFirebaseAuthUser() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const syncUser = async () => {
      const token = window.localStorage.getItem(
        'ai-iot-safety-stove-control.auth-token'
      );

      if (!token) {
        if (mounted) {
          setUser(null);
          setAuthReady(true);
        }
        return;
      }

      try {
        const currentUser = await authApi.getCurrentUser();
        if (mounted) {
          setUser(currentUser);
        }
      } catch {
        window.localStorage.removeItem('ai-iot-safety-stove-control.auth-token');
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setAuthReady(true);
        }
      }
    };

    syncUser();
    const handleAuthChanged = () => {
      setAuthReady(false);
      void syncUser();
    };

    window.addEventListener('auth-changed', handleAuthChanged);
    return () => {
      mounted = false;
      window.removeEventListener('auth-changed', handleAuthChanged);
    };
  }, []);

  return { user, authReady };
}
