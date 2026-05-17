import { create } from 'zustand';
import { isStandalone, isDismissedWithCooldown, dismissWithCooldown } from '../lib/pwa-utils';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  needRefresh: boolean;
  offlineReady: boolean;
  canInstall: boolean;
  updateSW: ((reloadPage?: boolean) => Promise<void>) | null;
  deferredPrompt: BeforeInstallPromptEvent | null;

  setNeedRefresh: (value: boolean) => void;
  setOfflineReady: (value: boolean) => void;
  setUpdateSW: (fn: (reloadPage?: boolean) => Promise<void>) => void;
  acceptUpdate: () => void;
  dismissUpdate: () => void;
  dismissOfflineReady: () => void;
  promptInstall: () => Promise<void>;
  dismissInstall: () => void;
  initInstallPrompt: () => () => void;
  resetServiceWorker: () => Promise<void>;
}

const INSTALL_DISMISSED_KEY = 'pwa-install-dismissed';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const usePwaStore = create<PwaState>((set, get) => ({
  needRefresh: false,
  offlineReady: false,
  canInstall: false,
  updateSW: null,
  deferredPrompt: null,

  setNeedRefresh: (value) => set({ needRefresh: value }),
  setOfflineReady: (value) => set({ offlineReady: value }),
  setUpdateSW: (fn) => set({ updateSW: fn }),

  acceptUpdate: () => {
    const { updateSW } = get();
    if (updateSW) {
      updateSW(true);
    }
    set({ needRefresh: false });
  },

  dismissUpdate: () => {
    set({ needRefresh: false });
  },

  dismissOfflineReady: () => {
    set({ offlineReady: false });
  },

  promptInstall: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      set({ canInstall: false, deferredPrompt: null });
    }
  },

  dismissInstall: () => {
    dismissWithCooldown(INSTALL_DISMISSED_KEY);
    set({ canInstall: false });
  },

  initInstallPrompt: () => {
    if (isStandalone()) return () => {};

    const handler = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;

      if (!isDismissedWithCooldown(INSTALL_DISMISSED_KEY, DISMISS_COOLDOWN_MS)) {
        set({ deferredPrompt: event, canInstall: true });
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    const appInstalledHandler = () => {
      set({ canInstall: false, deferredPrompt: null });
    };
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  },

  resetServiceWorker: async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    window.location.reload();
  },
}));
