import type { Meeting, User } from '@vklube/shared';

interface BuildArgs {
  meetings: Meeting[];
  currentUser: User;
  /**
   * Map club-username → display name. Optional; if missing, the link text
   * falls back to the username itself.
   */
  displayNames?: Map<string, string>;
}

const CLUB_USER_URL = 'https://vas3k.club/user/';

/**
 * Builds a plain text list of confirmed contacts as:
 *   Имя: https://vas3k.club/user/username/
 * If the display name is unknown, falls back to "@username".
 * Sorted alphabetically by username.
 */
export function buildProfilesMarkdown({
  meetings,
  currentUser,
  displayNames,
}: BuildArgs): string {
  const me = currentUser.username;
  const usernames = new Set<string>();
  for (const m of meetings) {
    if (m.status !== 'confirmed') continue;
    if (m.initiator_username === me) usernames.add(m.target_username);
    else if (m.target_username === me) usernames.add(m.initiator_username);
  }

  const sorted = Array.from(usernames).sort((a, b) => a.localeCompare(b));
  if (sorted.length === 0) return '';

  const lines = sorted.map((u) => {
    const name = displayNames?.get(u);
    const label = name && name !== u ? name : `@${u}`;
    return `${label}: ${CLUB_USER_URL}${encodeURIComponent(u)}/`;
  });
  return lines.join('\n');
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
