import { create } from 'zustand';
import { api } from '../lib/api';
import {
  saveMeeting,
  getAllMeetings,
  addToSyncQueue,
  deleteMeeting as deleteFromDB,
} from '../lib/db';
import { useAuthStore } from './auth';
import type { Meeting } from '@vklube/shared';

interface CreateMeetingArgs {
  targetUsername: string;
  targetCampUsername: string;
}

interface MeetingsState {
  meetings: Meeting[];
  isLoading: boolean;

  fetchMeetings: () => Promise<void>;
  refreshMeeting: (meetingId: string) => Promise<Meeting | null>;
  createMeeting: (args: CreateMeetingArgs) => Promise<Meeting>;
  requestWitnessCode: (meetingId: string) => Promise<Meeting>;
  confirmAsWitness: (witnessCode: string) => Promise<Meeting>;
  cancelMeeting: (meetingId: string) => Promise<void>;
  getMeetingWithUser: (campUsername: string) => Meeting | undefined;
}

export const useMeetingsStore = create<MeetingsState>((set, get) => ({
  meetings: [],
  isLoading: true,

  fetchMeetings: async () => {
    try {
      if (navigator.onLine) {
        const meetings = await api.get<Meeting[]>('/meetings');
        for (const meeting of meetings) {
          await saveMeeting(meeting);
        }
        set({ meetings, isLoading: false });
      } else {
        const meetings = await getAllMeetings();
        set({
          meetings: meetings.filter((m) => m.status !== 'cancelled'),
          isLoading: false,
        });
      }
    } catch {
      const meetings = await getAllMeetings();
      set({
        meetings: meetings.filter((m) => m.status !== 'cancelled'),
        isLoading: false,
      });
    }
  },

  refreshMeeting: async (meetingId: string) => {
    if (!navigator.onLine) return null;
    try {
      const meeting = await api.get<Meeting>(`/meetings/${meetingId}`);
      await saveMeeting(meeting);
      set({
        meetings: get().meetings.map((m) => (m.id === meetingId ? meeting : m)),
      });
      return meeting;
    } catch {
      return null;
    }
  },

  createMeeting: async ({ targetUsername, targetCampUsername }) => {
    const now = new Date().toISOString();

    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    // Optimistic local meeting
    const localMeeting: Meeting = {
      id: crypto.randomUUID(),
      initiator_username: currentUser.username,
      initiator_camp_username: currentUser.camp_username,
      initiator_display_name: currentUser.display_name,
      target_username: targetUsername,
      target_camp_username: targetCampUsername,
      target_display_name: '',
      witness_code: null,
      witness_code_expires_at: null,
      witness_username: null,
      witness_camp_username: null,
      status: 'unconfirmed',
      is_hidden_by_me: false,
      created_at: now,
      confirmed_at: null,
      cancelled_at: null,
      client_created_at: now,
    };

    if (navigator.onLine) {
      const meeting = await api.post<Meeting>('/meetings', {
        target_camp_username: targetCampUsername,
        client_created_at: now,
      });
      await saveMeeting(meeting);
      set({ meetings: [meeting, ...get().meetings] });
      return meeting;
    }

    // Offline: save locally + queue sync
    await saveMeeting(localMeeting);
    await addToSyncQueue({
      action: 'create_meeting',
      payload: {
        target_camp_username: targetCampUsername,
        client_created_at: now,
      },
      created_at: now,
      synced: false,
    });

    set({ meetings: [localMeeting, ...get().meetings] });
    return localMeeting;
  },

  requestWitnessCode: async (meetingId: string) => {
    const meeting = await api.post<Meeting>(`/meetings/${meetingId}/request-witness`);
    await saveMeeting(meeting);
    set({
      meetings: get().meetings.map((m) => (m.id === meetingId ? meeting : m)),
    });
    return meeting;
  },

  confirmAsWitness: async (witnessCode: string) => {
    const meeting = await api.post<Meeting>('/witness/confirm', { witness_code: witnessCode });
    const authState = useAuthStore.getState();
    if (authState.user) {
      useAuthStore.setState({
        user: {
          ...authState.user,
          approvals_available: authState.user.approvals_available - 1,
        },
      });
    }
    return meeting;
  },

  cancelMeeting: async (meetingId: string) => {
    if (navigator.onLine) {
      await api.post(`/meetings/${meetingId}/cancel`);
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

  getMeetingWithUser: (campUsername: string) => {
    return get().meetings.find(
      (m) =>
        m.status !== 'cancelled' &&
        (m.initiator_camp_username === campUsername ||
          m.target_camp_username === campUsername),
    );
  },
}));
