import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { getReturnPath } from '../lib/auth';

/**
 * OIDC callback landing page.
 * Server has already set the session cookie before redirecting here.
 * We just fetch /auth/me and redirect to the saved return path.
 */
export function CallbackPage() {
  const navigate = useNavigate();
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchMe();
      if (cancelled) return;
      const returnPath = getReturnPath();
      navigate(returnPath, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMe, navigate]);

  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      Авторизация...
    </div>
  );
}
