/**
 * Auth helpers — session is stored in httpOnly cookie set by the server.
 * Client cannot read it; rely on /api/auth/me to know who's logged in.
 */

const RETURN_PATH_KEY = 'auth_return_to';

export function setReturnPath(path: string): void {
  try {
    sessionStorage.setItem(RETURN_PATH_KEY, path);
  } catch {
    /* ignore */
  }
}

export function getReturnPath(): string {
  try {
    const path = sessionStorage.getItem(RETURN_PATH_KEY);
    sessionStorage.removeItem(RETURN_PATH_KEY);
    return path || '/';
  } catch {
    return '/';
  }
}
