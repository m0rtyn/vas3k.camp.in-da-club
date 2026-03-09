import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Meeting, User, SyncQueueItem } from '@vklube/shared';

interface VKlubeDB extends DBSchema {
  meetings: {
    key: string;
    value: Meeting;
    indexes: {
      'by-status': string;
      'by-initiator': string;
      'by-target': string;
    };
  };
  users: {
    key: string;
    value: User;
  };
  syncQueue: {
    key: number;
    value: SyncQueueItem;
    indexes: {
      'by-synced': number;
    };
  };
}

let dbInstance: IDBPDatabase<VKlubeDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<VKlubeDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<VKlubeDB>('vklube', 1, {
    upgrade(db) {
      // Meetings store
      const meetingStore = db.createObjectStore('meetings', { keyPath: 'id' });
      meetingStore.createIndex('by-status', 'status');
      meetingStore.createIndex('by-initiator', 'initiator_username');
      meetingStore.createIndex('by-target', 'target_username');

      // Users cache
      db.createObjectStore('users', { keyPath: 'username' });

      // Sync queue
      const syncStore = db.createObjectStore('syncQueue', {
        keyPath: 'id',
        autoIncrement: true,
      });
      syncStore.createIndex('by-synced', 'synced');
    },
  });

  return dbInstance;
}

// --- Meeting operations ---

export async function saveMeeting(meeting: Meeting): Promise<void> {
  const db = await getDB();
  await db.put('meetings', meeting);
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  const db = await getDB();
  return db.get('meetings', id);
}

export async function getAllMeetings(): Promise<Meeting[]> {
  const db = await getDB();
  return db.getAll('meetings');
}

export async function deleteMeeting(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('meetings', id);
}

// --- User cache ---

export async function saveUser(user: User): Promise<void> {
  const db = await getDB();
  await db.put('users', user);
}

export async function getUser(username: string): Promise<User | undefined> {
  const db = await getDB();
  return db.get('users', username);
}

// --- Sync queue ---

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<number> {
  const db = await getDB();
  return db.add('syncQueue', item as SyncQueueItem);
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('syncQueue', 'by-synced', 0);
  return all.filter((item) => !item.synced);
}

export async function markSynced(id: number): Promise<void> {
  const db = await getDB();
  const item = await db.get('syncQueue', id);
  if (item) {
    item.synced = true;
    await db.put('syncQueue', item);
  }
}

export async function getPendingCount(): Promise<number> {
  const items = await getPendingSyncItems();
  return items.length;
}
