export type MeetingStatus = 'pending' | 'unconfirmed' | 'confirmed' | 'cancelled';

export interface User {
  username: string;
  camp_username: string;
  display_name: string;
  avatar_url: string;
  bio: string | null;
  approvals_available: number;
  confirmed_contacts_count: number;
  is_admin: boolean;
  created_at: string;
}

export interface Meeting {
  id: string;
  /** Camp username of the meeting initiator (server-resolved from slug). */
  initiator_camp_username: string;
  /** Camp username of the meeting target (server-resolved from slug). */
  target_camp_username: string;
  witness_code: string | null;
  witness_code_expires_at: string | null;
  /** Camp username of the witness, if any. */
  witness_camp_username: string | null;
  status: MeetingStatus;
  /** Whether the current user has hidden this meeting from their view. */
  is_hidden_by_me: boolean;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  client_created_at: string;
}

export interface ApprovalGrant {
  id: string;
  granted_by: string;
  granted_to: string;
  amount: number;
  created_at: string;
}

export type SyncAction =
  | 'create_meeting'
  | 'witness_meeting'
  | 'cancel_meeting'
  | 'hide_meeting'
  | 'unhide_meeting';

export interface SyncQueueItem {
  id?: number;
  action: SyncAction;
  payload: Record<string, unknown>;
  created_at: string;
  synced: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  camp_username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  confirmed_count: number;
  is_self: boolean;
}

export interface CreateMeetingPayload {
  target_camp_username: string;
  client_created_at: string;
}

export interface ApiError {
  error: string;
  message: string;
}
