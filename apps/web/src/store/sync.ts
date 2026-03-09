import { create } from 'zustand';
import { getPendingCount } from '../lib/db';
import { initSync, onSyncChange } from '../lib/sync';

interface SyncState {
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;

  init: () => () => void;
  refreshPendingCount: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  isOnline: navigator.onLine,
  isSyncing: false,

  init: () => {
    const handleOnline = () => set({ isOnline: true });
    const handleOffline = () => set({ isOnline: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const cleanupSync = initSync();
    const cleanupListener = onSyncChange(async () => {
      const count = await getPendingCount();
      set({ pendingCount: count });
    });

    // Initial pending count
    getPendingCount().then((count) => set({ pendingCount: count }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      cleanupSync();
      cleanupListener();
    };
  },

  refreshPendingCount: async () => {
    const count = await getPendingCount();
    set({ pendingCount: count });
  },
}));
