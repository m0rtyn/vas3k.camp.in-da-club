export type MeetingStatus = 'pending' | 'unconfirmed' | 'confirmed' | 'cancelled';

export interface User {
  username: string;
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
  initiator_username: string;
  target_username: string;
  witness_code: string | null;
  witness_code_expires_at: string | null;
  witness_username: string | null;
  status: MeetingStatus;
  hidden_by: string[];
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
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  confirmed_count: number;
  is_self: boolean;
}

export interface CreateMeetingPayload {
  target_username: string;
  client_created_at: string;
}

export interface ApiError {
  error: string;
  message: string;
}
