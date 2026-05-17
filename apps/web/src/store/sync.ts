import { create } from 'zustand';
import { getPendingCount } from '../lib/db';
import { initSync, onSyncChange, syncToServer } from '../lib/sync';

interface SyncState {
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncError: string | null;

  init: () => () => void;
  refreshPendingCount: () => Promise<void>;
  retrySync: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncError: null,

  init: () => {
    const handleOnline = () => set({ isOnline: true });
    const handleOffline = () => set({ isOnline: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const cleanupSync = initSync();
    const cleanupListener = onSyncChange(async (error) => {
      const count = await getPendingCount();
      set({ pendingCount: count, lastSyncError: error });
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

  retrySync: async () => {
    set({ lastSyncError: null });
    await syncToServer();
  },
}));
