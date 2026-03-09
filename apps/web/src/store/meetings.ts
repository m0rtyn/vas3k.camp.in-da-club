import { create } from 'zustand';
import { api } from '../lib/api';
import {
  saveMeeting,
  getAllMeetings,
  addToSyncQueue,
  deleteMeeting as deleteFromDB,
} from '../lib/db';
import type { Meeting } from '@vklube/shared';

interface MeetingsState {
  meetings: Meeting[];
  isLoading: boolean;

  fetchMeetings: () => Promise<void>;
  createMeeting: (targetUsername: string) => Promise<Meeting>;
  cancelMeeting: (meetingId: string) => Promise<void>;
  hideMeeting: (meetingId: string) => Promise<void>;
  unhideMeeting: (meetingId: string) => Promise<void>;
  getMeetingWithUser: (username: string) => Meeting | undefined;
}

export const useMeetingsStore = create<MeetingsState>((set, get) => ({
  meetings: [],
  isLoading: true,

  fetchMeetings: async () => {
    try {
      // Try fetching from server first
      if (navigator.onLine) {
        const meetings = await api.get<Meeting[]>('/meetings');
        // Cache in IndexedDB
        for (const meeting of meetings) {
          await saveMeeting(meeting);
        }
        set({ meetings, isLoading: false });
      } else {
        // Offline: read from IndexedDB
        const meetings = await getAllMeetings();
        set({
          meetings: meetings.filter((m) => m.status !== 'cancelled'),
          isLoading: false,
        });
      }
    } catch {
      // Fallback to IndexedDB
      const meetings = await getAllMeetings();
      set({
        meetings: meetings.filter((m) => m.status !== 'cancelled'),
        isLoading: false,
      });
    }
  },

  createMeeting: async (targetUsername: string) => {
    const now = new Date().toISOString();

    // Optimistic local meeting
    const localMeeting: Meeting = {
      id: crypto.randomUUID(),
      initiator_username: '', // Will be set from auth store
      target_username: targetUsername,
      witness_code: null,
      witness_code_expires_at: null,
      witness_username: null,
      status: 'unconfirmed',
      hidden_by: [],
      created_at: now,
      confirmed_at: null,
      cancelled_at: null,
      client_created_at: now,
    };

    if (navigator.onLine) {
      try {
        const meeting = await api.post<Meeting>('/meetings', {
          target_username: targetUsername,
          client_created_at: now,
        });
        await saveMeeting(meeting);
        set({ meetings: [meeting, ...get().meetings] });
        return meeting;
      } catch (err) {
        throw err;
      }
    }

    // Offline: save locally + queue sync
    await saveMeeting(localMeeting);
    await addToSyncQueue({
      action: 'create_meeting',
      payload: {
        target_username: targetUsername,
        client_created_at: now,
      },
      created_at: now,
      synced: false,
    });

    set({ meetings: [localMeeting, ...get().meetings] });
    return localMeeting;
  },

  cancelMeeting: async (meetingId: string) => {
    if (navigator.onLine) {
      try {
        await api.post(`/meetings/${meetingId}/cancel`);
      } catch (err) {
        throw err;
      }
    } else {
      await addToSyncQueue({
        action: 'cancel_meeting',
        payload: { meeting_id: meetingId },
        created_at: new Date().toISOString(),
        synced: false,
      });
    }

    await deleteFromDB(meetingId);
    set({ meetings: get().meetings.filter((m) => m.id !== meetingId) });
  },

  hideMeeting: async (meetingId: string) => {
    if (navigator.onLine) {
      try {
        await api.post(`/meetings/${meetingId}/hide`);
      } catch (err) {
        throw err;
      }
    } else {
      await addToSyncQueue({
        action: 'hide_meeting',
        payload: { meeting_id: meetingId },
        created_at: new Date().toISOString(),
        synced: false,
      });
    }

    // Update local state
    set({
      meetings: get().meetings.map((m) =>
        m.id === meetingId ? { ...m, hidden_by: [...m.hidden_by, 'self'] } : m,
      ),
    });
  },

  unhideMeeting: async (meetingId: string) => {
    if (navigator.onLine) {
      try {
        await api.post(`/meetings/${meetingId}/unhide`);
      } catch (err) {
        throw err;
      }
    } else {
      await addToSyncQueue({
        action: 'unhide_meeting',
        payload: { meeting_id: meetingId },
        created_at: new Date().toISOString(),
        synced: false,
      });
    }

    set({
      meetings: get().meetings.map((m) =>
        m.id === meetingId ? { ...m, hidden_by: [] } : m,
      ),
    });
  },

  getMeetingWithUser: (username: string) => {
    return get().meetings.find(
      (m) =>
        m.status !== 'cancelled' &&
        (m.initiator_username === username || m.target_username === username),
    );
  },
}));
