import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMeetingsStore } from '../store/meetings';
import { useAuthStore } from '../store/auth';
import { WitnessCodeDisplay } from './WitnessCodeDisplay';
import styles from './MeetButton.module.css';

interface MeetButtonProps {
  /** Target user's club slug. Stored in optimistic local meeting for display. */
  targetUsername: string;
  /** Target user's camp_username. Used in the API payload. */
  targetCampUsername: string;
}

export function MeetButton({ targetUsername, targetCampUsername }: MeetButtonProps) {
  const { isAuthenticated } = useAuthStore();
  const meetings = useMeetingsStore((s) => s.meetings);
  const { createMeeting, requestWitnessCode, refreshMeeting } = useMeetingsStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const existingMeeting = meetings.find(
    (m) =>
      m.status !== 'cancelled' &&
      (m.initiator_camp_username === targetCampUsername ||
        m.target_camp_username === targetCampUsername),
  );

  // Poll a single meeting while its witness code is active.
  // Only polls when the tab is visible to save battery.
  const isPending = existingMeeting?.status === 'pending';
  const pendingId = isPending ? existingMeeting!.id : null;
  useEffect(() => {
    if (!pendingId) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        refreshMeeting(pendingId);
      }, 5000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshMeeting(pendingId); // immediate refresh on focus
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === 'visible') startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopPolling();
    };
  }, [pendingId, refreshMeeting]);

  if (!isAuthenticated) {
    return (
      <Link to="/login" className={`${styles.button} ${styles.meet}`}>
        Войдите, чтобы записать встречу
      </Link>
    );
  }

  // Meeting confirmed
  if (existingMeeting && existingMeeting.status === 'confirmed') {
    const date = new Date(existingMeeting.created_at).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div>
        <div className={`${styles.button} ${styles.alreadyMet}`}>
          ✓ Подтверждено
        </div>
        <div className={styles.metDate}>{date}</div>
      </div>
    );
  }

  // Meeting pending (witness code active)
  if (existingMeeting && existingMeeting.status === 'pending' && existingMeeting.witness_code) {
    const handleRefresh = async () => {
      setError(null);
      try {
        await requestWitnessCode(existingMeeting.id);
      } catch (err: unknown) {
        setError((err as { message?: string })?.message || 'Ошибка');
      }
    };

    return (
      <div>
        <WitnessCodeDisplay
          code={existingMeeting.witness_code}
          expiresAt={existingMeeting.witness_code_expires_at!}
          onRefresh={handleRefresh}
        />
        {error && <div className={styles.metDate} style={{ color: 'var(--color-error)' }}>{error}</div>}
      </div>
    );
  }

  // Meeting unconfirmed — offer to get witness code
  if (existingMeeting && existingMeeting.status === 'unconfirmed') {
    const date = new Date(existingMeeting.created_at).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    const handleRequestCode = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await requestWitnessCode(existingMeeting.id);
      } catch (err: unknown) {
        setError((err as { message?: string })?.message || 'Ошибка');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div>
        <div className={`${styles.button} ${styles.alreadyMet}`}>
          ✓ Уже знакомы
        </div>
        <div className={styles.metDate}>{date}</div>
        <button
          className={`${styles.button} ${styles.witness}`}
          onClick={handleRequestCode}
          disabled={isLoading}
          style={{ marginTop: 8 }}
        >
          {isLoading ? 'Генерирую...' : '👁 Позвать свидетеля'}
        </button>
        {error && <div className={styles.metDate} style={{ color: 'var(--color-error)' }}>{error}</div>}
      </div>
    );
  }

  // No meeting yet — create
  const handleMeet = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      await createMeeting({ targetUsername, targetCampUsername });
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'Ошибка';
      setError(message);
    } finally {
      setIsLoading(false);
      submittingRef.current = false;
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
