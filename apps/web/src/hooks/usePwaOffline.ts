/**
 * usePwaOffline — React hook for PWA offline status and installation state.
 *
 * Returns:
 *  - isOnline: boolean — current network connectivity
 *  - isInstalled: boolean — whether app is running as installed PWA (standalone)
 *  - canInstall: boolean — whether PWA install prompt is available
 *  - promptInstall: () => void — trigger the browser install prompt
 */

import { useEffect, useState, useCallback } from 'react';

interface PwaOfflineState {
  isOnline: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  promptInstall: () => void;
}

let _deferredInstallPrompt: any = null;

export function usePwaOffline(): PwaOfflineState {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isInstalled, setIsInstalled] = useState(
    typeof window !== 'undefined' &&
    window.matchMedia('(display-mode: standalone)').matches
  );
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      _deferredInstallPrompt = e;
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Track app installed state
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setCanInstall(false);
      _deferredInstallPrompt = null;
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = useCallback(() => {
    if (_deferredInstallPrompt) {
      _deferredInstallPrompt.prompt();
      _deferredInstallPrompt.userChoice.then(() => {
        _deferredInstallPrompt = null;
        setCanInstall(false);
      });
    }
  }, []);

  return { isOnline, isInstalled, canInstall, promptInstall };
}
