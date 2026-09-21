// Service Worker & PWA Install Manager

let deferredInstallPrompt: any = null;
const installListeners = new Set<(canInstall: boolean) => void>();

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered successfully with scope:', reg.scope);

          // Check for SW updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New version available! Reloading or notification can be shown.');
                }
              });
            }
          });
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration failed:', err);
        });
    });

    // Listen for install prompt from browser
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      notifyInstallListeners(true);
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      notifyInstallListeners(false);
      console.log('[PWA] TradeFlow successfully installed as standalone app!');
    });
  }
}

export function onInstallAvailabilityChange(callback: (canInstall: boolean) => void): () => void {
  installListeners.add(callback);
  callback(deferredInstallPrompt !== null);
  return () => {
    installListeners.delete(callback);
  };
}

function notifyInstallListeners(canInstall: boolean) {
  installListeners.forEach((cb) => cb(canInstall));
}

export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) return false;
  try {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    notifyInstallListeners(false);
    return outcome === 'accepted';
  } catch (err) {
    console.error('[PWA] Install prompt error:', err);
    return false;
  }
}
