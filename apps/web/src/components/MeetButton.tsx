import { useState } from 'react';
import { useMeetingsStore } from '../store/meetings';
import { useAuthStore } from '../store/auth';
import styles from './MeetButton.module.css';

interface MeetButtonProps {
  targetUsername: string;
}

export function MeetButton({ targetUsername }: MeetButtonProps) {
  const { isAuthenticated } = useAuthStore();
  const { createMeeting, getMeetingWithUser } = useMeetingsStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingMeeting = getMeetingWithUser(targetUsername);

  if (!isAuthenticated) {
    return (
      <a href="/login" className={`${styles.button} ${styles.meet}`}>
        Войдите, чтобы записать встречу
      </a>
    );
  }

  if (existingMeeting) {
    const date = new Date(existingMeeting.created_at).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div>
        <div className={`${styles.button} ${styles.alreadyMet}`}>
          ✓ Уже знакомы
        </div>
        <div className={styles.metDate}>{date}</div>
      </div>
    );
  }

  const handleMeet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await createMeeting(targetUsername);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'Ошибка';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        className={`${styles.button} ${styles.meet}`}
        onClick={handleMeet}
        disabled={isLoading}
      >
        {isLoading ? 'Записываю...' : '🤝 Я познакомился'}
      </button>
      {error && <div className={styles.metDate} style={{ color: 'var(--color-error)' }}>{error}</div>}
    </div>
  );
}
