import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { getReturnPath } from '../lib/auth';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const navigate = useNavigate();
  const { devLogin } = useAuthStore();
  const [devUsername, setDevUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDevLogin = async () => {
    if (!devUsername.trim()) return;
    setIsLoading(true);
    try {
      await devLogin(devUsername.trim());
      navigate(getReturnPath());
    } catch {
      alert('Ошибка входа');
    }
    setIsLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.title}>👋 ВКлубе</div>
      <div className={styles.subtitle}>
        Войдите через vas3k.club, чтобы записывать знакомства на кэмпе
      </div>

      <a href="/api/auth/login" className={styles.loginButton}>
        Войти через vas3k.club
      </a>

      {/* Dev login — only shown in development */}
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
    </div>
  );
}
