import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReturnPath } from '../lib/auth';

/**
 * OIDC callback page.
 * In production: handles the authorization code from vas3k.club OIDC.
 * For now: redirects to the return path (actual OIDC token exchange happens server-side).
 */
export function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // TODO: In production OIDC flow, the server handles the callback
    // and sets a session cookie. The client just needs to redirect.
    const returnPath = getReturnPath();
    navigate(returnPath, { replace: true });
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      Авторизация...
    </div>
  );
}
