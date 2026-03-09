import { api } from './api';
import { getPendingSyncItems, markSynced } from './db';
import type { SyncAction } from '@vklube/shared';

interface SyncResult {
  index: number;
  action: SyncAction;
  success: boolean;
  data?: unknown;
  error?: string;
}

let isSyncing = false;
let syncListeners: Array<() => void> = [];

export function onSyncChange(listener: () => void): () => void {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
}

function notifyListeners() {
  syncListeners.forEach((l) => l());
}

/**
 * Replay all pending sync queue items to the server.
 * Called on `online` event and periodically.
 */
export async function syncToServer(): Promise<void> {
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;

  try {
    const pending = await getPendingSyncItems();
    if (pending.length === 0) return;

    const items = pending.map((item) => ({
      action: item.action,
      payload: item.payload,
      client_created_at: item.created_at,
    }));

    const { results } = await api.post<{ results: SyncResult[] }>('/sync', { items });

    // Mark successful items as synced
    for (const result of results) {
      if (result.success && pending[result.index].id !== undefined) {
        await markSynced(pending[result.index].id!);
      }
    }
  } catch {
    // Network error — will retry on next sync
  } finally {
    isSyncing = false;
    notifyListeners();
  }
}

/**
 * Initialize sync engine — listen for online events and poll periodically.
 */
export function initSync(): () => void {
  const handleOnline = () => {
    syncToServer();
  };

  window.addEventListener('online', handleOnline);

  // Poll every 30 seconds when app is open and online
  const interval = setInterval(() => {
    if (navigator.onLine) {
      syncToServer();
    }
  }, 30_000);

  // Trigger initial sync
  if (navigator.onLine) {
    syncToServer();
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(interval);
  };
}
