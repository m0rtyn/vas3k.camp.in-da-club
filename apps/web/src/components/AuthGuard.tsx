import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { redirectToLogin } from '../lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      redirectToLogin();
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return <p>Загрузка...</p>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
