/** Number of approvals each user starts with */
export const INITIAL_APPROVALS = 5;


/** How many confirmed contacts to earn +1 approval */
export const CONTACTS_PER_APPROVAL = 2;
export const APPROVALS_HINT = `Апрувы нужны на подтверждение контактов. Их тратит свидетель. Всем на старте выдаётся по ${INITIAL_APPROVALS} апрувов, а затем по одному за каждые ${CONTACTS_PER_APPROVAL} новых знакомства — обоим участникам встречи.`;

/** Time window (ms) within which a meeting can be cancelled (hard delete) */
export const CANCEL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** Witness code validity duration (ms) */
export const WITNESS_CODE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/** Number of digits in witness code */
export const WITNESS_CODE_LENGTH = 4;

/** How many top leaderboard entries show real names */
export const LEADERBOARD_VISIBLE_TOP = 20;

/** Camp timezone for time-based achievements */
export const CAMP_TIMEZONE = 'Europe/Belgrade';

/**
 * Camp start/end (ISO 8601, UTC).
 * TODO: replace placeholders with exact dates before release.
 * Used for gating the Recap page and time-based logic.
 */
export const CAMP_START_DATE = '2026-05-28T10:00:00+02:00';
export const CAMP_END_DATE = '2026-06-01T15:00:00+02:00';

/** App name */
export const APP_NAME = 'ВКлубе';

/** Meeting statuses */
export const MEETING_STATUSES = {
  PENDING: 'pending',
  UNCONFIRMED: 'unconfirmed',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
} as const;
