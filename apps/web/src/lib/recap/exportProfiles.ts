import type { Meeting, User } from '@vklube/shared';

interface BuildArgs {
  meetings: Meeting[];
  currentUser: User;
  /**
   * Map club-username → display name. Optional; if missing, the label
   * falls back to "@username".
   */
  displayNames?: Map<string, string>;
}

export interface ProfileEntry {
  /** Club slug (vas3k.club username). */
  username: string;
  /** Human-readable label: display_name or "@username" if unknown. */
  label: string;
  /** Profile URL on vas3k.club. */
  url: string;
}

const CLUB_USER_URL = 'https://vas3k.club/user/';

/**
 * Returns confirmed contacts in chronological order — oldest meeting first.
 * Each contact appears at most once (the earliest confirmation wins).
 */
export function buildProfilesList({
  meetings,
  currentUser,
  displayNames,
}: BuildArgs): ProfileEntry[] {
  const me = currentUser.username;
  const seen = new Map<string, string>(); // username → earliest confirmed_at

  for (const m of meetings) {
    if (m.status !== 'confirmed') continue;
    const other =
      m.initiator_username === me
        ? m.target_username
        : m.target_username === me
        ? m.initiator_username
        : null;
    if (!other) continue;
    const when = m.confirmed_at ?? m.created_at;
    const prev = seen.get(other);
    if (!prev || when < prev) seen.set(other, when);
  }

  return Array.from(seen.entries())
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([username]) => {
      const name = displayNames?.get(username);
      const label = name && name !== username ? name : `@${username}`;
      return {
        username,
        label,
        url: `${CLUB_USER_URL}${encodeURIComponent(username)}/`,
      };
    });
}

/**
 * Plain-text representation of the contact list — one `Имя: URL` per line.
 * Used for clipboard copy.
 */
export function formatProfilesText(list: ProfileEntry[]): string {
  return list.map((p) => `${p.label}: ${p.url}`).join('\n');
}

/** Copies text to clipboard with a graceful fallback. Returns true on success. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
