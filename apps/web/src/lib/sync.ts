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
let syncListeners: Array<(error: string | null) => void> = [];
let backoffMs = 30_000;
const MIN_BACKOFF = 30_000;
const MAX_BACKOFF = 5 * 60_000;

export function onSyncChange(listener: (error: string | null) => void): () => void {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
}

function notifyListeners(error: string | null) {
  syncListeners.forEach((l) => l(error));
}

/**
 * Replay all pending sync queue items to the server.
 * Called on `online` event and periodically.
 */
export async function syncToServer(): Promise<void> {
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;

  let syncError: string | null = null;

  try {
    const pending = await getPendingSyncItems();
    if (pending.length === 0) return;

    const items = pending.map((item) => ({
      action: item.action,
      payload: item.payload,
      client_created_at: item.created_at,
    }));

    const { results } = await api.post<{ results: SyncResult[] }>('/sync', { items });

    // Mark each replayed item as synced, regardless of success.
    // - success=true → server applied the action (or it was idempotent no-op)
    // - success=false → permanent client-side problem (expired code, conflict, etc.).
    //   Keeping it in the queue would cause infinite retries.
    // Server/network failures throw and skip this whole branch (item stays pending).
    for (const result of results) {
      const queueItem = pending[result.index];
      if (queueItem?.id !== undefined) {
        if (!result.success) {
          console.warn('Sync item permanently failed:', result.action, result.error);
        }
        await markSynced(queueItem.id);
      }
    }

    // Reset backoff on success
    backoffMs = MIN_BACKOFF;
  } catch (err) {
    syncError = err instanceof Error ? err.message : 'Sync failed';
    console.error('Sync failed:', err);
    // Increase backoff on failure
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF);
  } finally {
    isSyncing = false;
    notifyListeners(syncError);
  }
}

/**
 * Initialize sync engine — listen for online events and poll with backoff.
 */
export function initSync(): () => void {
  const handleOnline = () => {
    backoffMs = MIN_BACKOFF; // Reset backoff when coming online
    syncToServer();
  };

  window.addEventListener('online', handleOnline);

  let timeoutId: ReturnType<typeof setTimeout>;

  function scheduleNext() {
    timeoutId = setTimeout(() => {
      if (navigator.onLine) {
        syncToServer().finally(scheduleNext);
      } else {
        scheduleNext();
      }
    }, backoffMs);
  }

  // Trigger initial sync
  if (navigator.onLine) {
    syncToServer().finally(scheduleNext);
  } else {
    scheduleNext();
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    clearTimeout(timeoutId);
  };
}
