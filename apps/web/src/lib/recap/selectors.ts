import type { Meeting, User } from '@vklube/shared';

export interface RecapContext {
  meetings: Meeting[];
  currentUser: User;
}

/** Confirmed meetings the current user participated in (initiator or target). */
export function getConfirmedMeetings(ctx: RecapContext): Meeting[] {
  const { meetings, currentUser } = ctx;
  return meetings.filter(
    (m) =>
      m.status === 'confirmed' &&
      (m.initiator_username === currentUser.username ||
        m.target_username === currentUser.username),
  );
}

/** Meetings where current user was the witness (confirmed). */
export function getWitnessedMeetings(ctx: RecapContext): Meeting[] {
  return ctx.meetings.filter(
    (m) => m.status === 'confirmed' && m.witness_username === ctx.currentUser.username,
  );
}

/** Camp usernames of unique people the current user met (confirmed). */
export function getUniquePeopleMet(ctx: RecapContext): string[] {
  const me = ctx.currentUser.username;
  const set = new Set<string>();
  for (const m of getConfirmedMeetings(ctx)) {
    const other = m.initiator_username === me ? m.target_username : m.initiator_username;
    set.add(other);
  }
  return Array.from(set);
}

/** Returns YYYY-MM-DD bucket of a date in the camp's local timezone. */
export function localDayKey(iso: string, timeZone: string): string {
  const d = new Date(iso);
  // en-CA gives "YYYY-MM-DD"
  return d.toLocaleDateString('en-CA', { timeZone });
}

/** Returns hour (0–23) of a date in the camp's local timezone. */
export function localHour(iso: string, timeZone: string): number {
  const d = new Date(iso);
  const h = d.toLocaleString('en-US', { timeZone, hour: '2-digit', hour12: false });
  return parseInt(h, 10) % 24;
}

/** Meetings grouped by local-day key. */
export function getMeetingsByDay(
  meetings: Meeting[],
  timeZone: string,
): Map<string, Meeting[]> {
  const result = new Map<string, Meeting[]>();
  for (const m of meetings) {
    if (!m.confirmed_at) continue;
    const key = localDayKey(m.confirmed_at, timeZone);
    const arr = result.get(key);
    if (arr) arr.push(m);
    else result.set(key, [m]);
  }
  return result;
}

export interface TimelinePoint {
  /** Local day YYYY-MM-DD */
  date: string;
  /** Confirmed meetings on this day */
  daily: number;
  /** Running cumulative total up to and including this day */
  cumulative: number;
}

/**
 * Cumulative confirmed-contacts timeline by local day.
 * Fills missing days between first and last with zero-daily entries.
 */
export function getTimelineCumulative(
  ctx: RecapContext,
  timeZone: string,
): TimelinePoint[] {
  const confirmed = getConfirmedMeetings(ctx).filter((m) => m.confirmed_at);
  if (confirmed.length === 0) return [];

  const byDay = getMeetingsByDay(confirmed, timeZone);
  const sortedDays = Array.from(byDay.keys()).sort();
  if (sortedDays.length === 0) return [];

  // Fill gaps between first and last day.
  const first = sortedDays[0]!;
  const last = sortedDays[sortedDays.length - 1]!;
  const days: string[] = [];
  for (
    let d = new Date(first + 'T00:00:00Z');
    d <= new Date(last + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    days.push(d.toISOString().slice(0, 10));
  }

  let acc = 0;
  return days.map((date) => {
    const daily = byDay.get(date)?.length ?? 0;
    acc += daily;
    return { date, daily, cumulative: acc };
  });
}

export interface ContactGraphNode {
  /** Club username. */
  id: string;
  camp_username: string;
  display_name: string;
  /** Is this the ego (current user). */
  isMe: boolean;
}

export interface ContactGraphEdge {
  source: string;
  target: string;
}

export interface ContactGraphData {
  nodes: ContactGraphNode[];
  edges: ContactGraphEdge[];
}

/**
 * Builds a contact graph from confirmed meetings of the current user.
 * Each unique counterparty becomes a node connected to ego.
 * (Future: include meetings between non-ego counterparties when sync exposes that data.)
 */
export function getContactGraphData(ctx: RecapContext): ContactGraphData {
  const me = ctx.currentUser;
  const nodes: ContactGraphNode[] = [
    {
      id: me.username,
      camp_username: me.camp_username,
      display_name: me.display_name,
      isMe: true,
    },
  ];
  const edges: ContactGraphEdge[] = [];
  const seen = new Set<string>();

  for (const m of getConfirmedMeetings(ctx)) {
    const isInitiator = m.initiator_username === me.username;
    const otherUsername = isInitiator ? m.target_username : m.initiator_username;
    const otherCamp = isInitiator ? m.target_camp_username : m.initiator_camp_username;
    if (seen.has(otherUsername)) continue;
    seen.add(otherUsername);
    nodes.push({
      id: otherUsername,
      camp_username: otherCamp,
      // We don't have other users' display_name locally; fall back to username.
      display_name: otherUsername,
      isMe: false,
    });
    edges.push({ source: me.username, target: otherUsername });
  }

  return { nodes, edges };
}
