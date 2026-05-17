import { registerSW } from 'virtual:pwa-register';
import { usePwaStore } from '../store/pwa';

export function initServiceWorker(): void {
  const updateSW = registerSW({
    onNeedRefresh() {
      usePwaStore.getState().setNeedRefresh(true);
    },
    onOfflineReady() {
      usePwaStore.getState().setOfflineReady(true);
    },
    onRegisteredSW(_swUrl: string, registration?: ServiceWorkerRegistration) {
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
  });

  usePwaStore.getState().setUpdateSW(updateSW);
}
