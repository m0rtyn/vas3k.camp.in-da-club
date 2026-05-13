import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getReturnPath, setAuthToken } from '../lib/auth';

/**
 * OIDC callback page.
 * Server redirects here with ?token={username} after successful OIDC auth.
 * Stores token in localStorage and redirects to the return path.
 */
export function CallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setAuthToken(token);
    }
    const returnPath = getReturnPath();
    navigate(returnPath, { replace: true });
  }, [navigate, searchParams]);

  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      Авторизация...
    </div>
  );
}
