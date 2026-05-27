import { CAMP_TIMEZONE } from '@vklube/shared';
import type { Meeting } from '@vklube/shared';
import {
  getConfirmedMeetings,
  getMeetingsByDay,
  getWitnessedMeetings,
  localDayKey,
  localHour,
  type RecapContext,
} from './selectors';

export interface FunStats {
  totalConfirmed: number;
  totalAll: number;
  uniquePeople: number;
  witnessedCount: number;
  /** Confirmed ratio (0..1) over all non-cancelled meetings the user is in. */
  confirmedRatio: number;
  /** Date (YYYY-MM-DD local) of the most active day, with count. */
  mostActiveDay: { date: string; count: number } | null;
  /** Latest meeting by local clock (max local hour-of-day across all days). */
  latestNightMeeting: { meeting: Meeting; localHour: number } | null;
  /** Earliest meeting by local clock. */
  earliestMorningMeeting: { meeting: Meeting; localHour: number } | null;
  /** First confirmed meeting of the user. */
  firstMeeting: Meeting | null;
  /** Last confirmed meeting of the user. */
  lastMeeting: Meeting | null;
  /** Average gap between consecutive confirmed meetings, in hours. */
  avgGapHours: number | null;
  /** Share of meetings during night hours (00:00–06:00 local). */
  nightShare: number;
}

export function computeFunStats(ctx: RecapContext): FunStats {
  const confirmed = getConfirmedMeetings(ctx);
  const all = ctx.meetings.filter(
    (m) =>
      m.status !== 'cancelled' &&
      (m.initiator_username === ctx.currentUser.username ||
        m.target_username === ctx.currentUser.username),
  );
  const witnessed = getWitnessedMeetings(ctx);

  const byDay = getMeetingsByDay(confirmed, CAMP_TIMEZONE);
  let mostActive: { date: string; count: number } | null = null;
  for (const [date, list] of byDay) {
    if (!mostActive || list.length > mostActive.count) {
      mostActive = { date, count: list.length };
    }
  }

  let latest: { meeting: Meeting; localHour: number } | null = null;
  let earliest: { meeting: Meeting; localHour: number } | null = null;
  let nightCount = 0;
  for (const m of confirmed) {
    if (!m.confirmed_at) continue;
    const h = localHour(m.confirmed_at, CAMP_TIMEZONE);
    if (h >= 0 && h < 6) nightCount += 1;
    // "Night" winner = highest hour in 18..23 OR 0..5 (treat 0..5 as 24..29 for comparison).
    const nightScore = h < 6 ? h + 24 : h;
    if (!latest || nightScore > (latest.localHour < 6 ? latest.localHour + 24 : latest.localHour)) {
      latest = { meeting: m, localHour: h };
    }
    if (!earliest || h < earliest.localHour) {
      earliest = { meeting: m, localHour: h };
    }
  }

  // Sort confirmed by confirmed_at to compute first/last + average gap.
  const sorted = [...confirmed]
    .filter((m) => m.confirmed_at)
    .sort((a, b) => new Date(a.confirmed_at!).getTime() - new Date(b.confirmed_at!).getTime());
  const first = sorted[0] ?? null;
  const last = sorted[sorted.length - 1] ?? null;

  let avgGapHours: number | null = null;
  if (sorted.length >= 2) {
    let sum = 0;
    for (let i = 1; i < sorted.length; i++) {
      sum +=
        new Date(sorted[i]!.confirmed_at!).getTime() -
        new Date(sorted[i - 1]!.confirmed_at!).getTime();
    }
    avgGapHours = sum / (sorted.length - 1) / (1000 * 60 * 60);
  }

  return {
    totalConfirmed: confirmed.length,
    totalAll: all.length,
    uniquePeople: new Set(
      confirmed.map((m) =>
        m.initiator_username === ctx.currentUser.username
          ? m.target_username
          : m.initiator_username,
      ),
    ).size,
    witnessedCount: witnessed.length,
    confirmedRatio: all.length === 0 ? 0 : confirmed.length / all.length,
    mostActiveDay: mostActive,
    latestNightMeeting: latest,
    earliestMorningMeeting: earliest,
    firstMeeting: first,
    lastMeeting: last,
    avgGapHours,
    nightShare: confirmed.length === 0 ? 0 : nightCount / confirmed.length,
  };
}

/** Formats a YYYY-MM-DD local date as "12 июня". */
export function formatRussianDate(dateKey: string): string {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ];
  const [, m, d] = dateKey.split('-').map((x) => parseInt(x, 10));
  if (!m || !d) return dateKey;
  return `${d} ${months[m - 1]}`;
}

/** "03:14" given the meeting's confirmed_at in CAMP_TIMEZONE. */
export function formatLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    timeZone: CAMP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export { localDayKey };
