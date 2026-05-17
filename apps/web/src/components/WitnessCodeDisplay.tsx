import { useState, useEffect } from 'react';
import styles from './WitnessCodeDisplay.module.css';

interface WitnessCodeDisplayProps {
  code: string;
  expiresAt: string;
  onRefresh: () => Promise<void>;
}

export function WitnessCodeDisplay({ code, expiresAt, onRefresh }: WitnessCodeDisplayProps) {
  const [remainingMs, setRemainingMs] = useState(() => {
    return new Date(expiresAt).getTime() - Date.now();
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const isExpired = remainingMs <= 0;
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isExpired) {
    return (
      <div className={styles.container}>
        <div className={styles.expired}>Код истёк</div>
        <button
          className={styles.refreshButton}
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Генерирую...' : 'Получить новый код'}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.label}>Код для свидетеля</div>
      <div className={styles.code}>{code}</div>
      <div className={`${styles.timer} ${seconds < 60 ? styles.timerExpiring : ''}`}>
        {minutes}:{secs.toString().padStart(2, '0')}
      </div>
      <div className={styles.hint}>Покажите этот код третьему участнику</div>
    </div>
  );
}
