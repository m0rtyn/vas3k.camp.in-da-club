/**
 * Auth configuration for OIDC with vas3k.club.
 *
 * In dev mode, uses DEV_USER-based auth:
 * - Call POST /api/auth/dev-login with { username } to get a session
 * - Store the username as auth_token in localStorage
 *
 * In production, will use proper OIDC flow:
 * - Redirect to vas3k.club OIDC authorize endpoint
 * - Handle callback with authorization code
 * - Exchange code for tokens server-side
 */

export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('auth_token');
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Redirect to login page, storing the current path to redirect back after auth.
 */
export function redirectToLogin(): void {
  const returnTo = window.location.pathname;
  if (returnTo !== '/login' && returnTo !== '/callback') {
    localStorage.setItem('auth_return_to', returnTo);
  }
  window.location.href = '/login';
}

/**
 * Get stored return path after auth callback.
 */
export function getReturnPath(): string {
  const path = localStorage.getItem('auth_return_to');
  localStorage.removeItem('auth_return_to');
  return path || '/';
}
