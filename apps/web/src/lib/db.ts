import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Meeting, User, SyncQueueItem } from '@vklube/shared';

interface VKlubeDB extends DBSchema {
  meetings: {
    key: string;
    value: Meeting;
    indexes: {
      'by-status': string;
      'by-initiator-camp': string;
      'by-target-camp': string;
    };
  };
  users: {
    key: string;
    value: User;
    indexes: {
      'by-camp-username': string;
    };
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

  dbInstance = await openDB<VKlubeDB>('vklube', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 2) {
        // Schema v2: switched to camp_username-based meeting and user lookups.
        // Drop and recreate all stores; cached entries with the old shape are
        // not compatible.
        for (const name of ['meetings', 'users', 'syncQueue'] as const) {
          if (db.objectStoreNames.contains(name)) {
            db.deleteObjectStore(name);
          }
        }

        const meetingStore = db.createObjectStore('meetings', { keyPath: 'id' });
        meetingStore.createIndex('by-status', 'status');
        meetingStore.createIndex('by-initiator-camp', 'initiator_camp_username');
        meetingStore.createIndex('by-target-camp', 'target_camp_username');

        const userStore = db.createObjectStore('users', { keyPath: 'username' });
        userStore.createIndex('by-camp-username', 'camp_username');

        const syncStore = db.createObjectStore('syncQueue', {
          keyPath: 'id',
          autoIncrement: true,
        });
        syncStore.createIndex('by-synced', 'synced');
      }
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

export async function getUserByCampUsername(campUsername: string): Promise<User | undefined> {
  const db = await getDB();
  return db.getFromIndex('users', 'by-camp-username', campUsername);
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

export async function clearAllLocalData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('meetings'),
    db.clear('users'),
    db.clear('syncQueue'),
  ]);
}
