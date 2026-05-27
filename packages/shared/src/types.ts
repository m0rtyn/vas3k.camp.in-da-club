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
  /** Club slug (vas3k.club username) of the meeting initiator. Used for display. */
  initiator_username: string;
  /** Camp username of the meeting initiator. Used in URLs / NFC chips. */
  initiator_camp_username: string;
  /** Club slug of the meeting target. */
  target_username: string;
  /** Camp username of the meeting target. */
  target_camp_username: string;
  witness_code: string | null;
  witness_code_expires_at: string | null;
  /** Club slug of the witness, if any. */
  witness_username: string | null;
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

/** Holder of a global achievement (single winner). */
export interface AchievementHolder {
  username: string;
  camp_username: string | null;
  display_name: string;
  avatar_url: string | null;
}

/** Camp-wide aggregate stats + global single-winner achievements. */
export interface RecapStats {
  /** Median of confirmed contacts per participant (who has >=1 meeting). */
  median: number;
  /** Arithmetic mean of confirmed contacts per participant. */
  mean: number;
  p25: number;
  p75: number;
  p90: number;
  /** Number of participants with at least one confirmed meeting. */
  total_participants: number;
  /** Total confirmed meetings across the camp. */
  total_meetings: number;
  global_achievements: {
    /** First confirmed meeting of the camp. */
    first_meeting:
      | {
          initiator: AchievementHolder;
          target: AchievementHolder;
          confirmed_at: string;
        }
      | null;
    /** User with the most confirmed meetings. */
    top_networker: (AchievementHolder & { count: number }) | null;
    /** User who acted as witness the most times. */
    top_witness: (AchievementHolder & { count: number }) | null;
  };
}
