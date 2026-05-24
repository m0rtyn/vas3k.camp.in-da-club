import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { getReturnPath, setReturnPath } from '../lib/auth';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { devLogin } = useAuthStore();
  const [devUsername, setDevUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const returnTo = (location.state as { returnTo?: string })?.returnTo;

  // Save returnTo for OIDC callback flow (full page navigation loses router state)
  useEffect(() => {
    if (returnTo) {
      setReturnPath(returnTo);
    }
  }, [returnTo]);

  const handleDevLogin = async () => {
    if (!devUsername.trim()) return;
    setIsLoading(true);
    try {
      await devLogin(devUsername.trim());
      navigate(returnTo || getReturnPath());
    } catch {
      alert('Ошибка входа');
    }
    setIsLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.title}>👋 Вастрик.ВКлубе</div>
      <div className={styles.subtitle}>
        Войдите через vas3k.club, чтобы записывать знакомства на кэмпе
      </div>

      <a href="/api/auth/login" className={styles.loginButton}>
        Войти через vas3k.club
      </a>

      {/* Dev login — only shown in development */}
      {import.meta.env.DEV && (
        <div className={styles.devSection}>
          <div className={styles.devTitle}>🔧 Dev-режим</div>
          <div className={styles.devForm}>
            <input
              type="text"
              className={styles.devInput}
              placeholder="username"
              value={devUsername}
              onChange={(e) => setDevUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDevLogin()}
            />
            <button
              className={styles.devButton}
              onClick={handleDevLogin}
              disabled={isLoading}
            >
              Войти
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
