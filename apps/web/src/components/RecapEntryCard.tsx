import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CAMP_END_DATE } from '@vklube/shared';
import styles from './RecapEntryCard.module.css';

const ONE_HOUR_MS = 60 * 60 * 1000;
const END_TS = new Date(CAMP_END_DATE).getTime();

export function RecapEntryCard() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId) return;
      setNow(Date.now());
      intervalId = setInterval(() => setNow(Date.now()), 1000);
    };
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, []);

  const msLeft = END_TS - now;
  const isOver = msLeft <= 0;
  const isFinalHour = !isOver && msLeft < ONE_HOUR_MS;

  if (isOver) {
    return (
      <Link to="/recap" className={`${styles.card} ${styles.cardLink}`}>
        <div className={styles.icon}>📊</div>
        <div className={styles.body}>
          <div className={styles.title}>Итоги ВКлубе</div>
          <div className={styles.subtitle}>Посмотреть твою статистику кэмпа →</div>
        </div>
      </Link>
    );
  }

  return (
    <div
      className={`${styles.card} ${styles.cardDisabled}`}
      role="group"
      aria-disabled="true"
    >
      <div className={styles.icon}>🔒</div>
      <div className={styles.body}>
        <div className={styles.title}>Итоги ВКлубе</div>
        <div className={styles.subtitle}>Открываются через</div>
        <time
          className={`${styles.countdown} ${isFinalHour ? styles.countdownUrgent : ''}`}
          aria-live="polite"
          dateTime={new Date(END_TS).toISOString()}
        >
          {formatCountdown(msLeft)}
        </time>
      </div>
    </div>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}${plural(days, 'д', 'д', 'д')}`);
  if (days > 0 || hours > 0) parts.push(`${hours}ч`);
  if (days > 0 || hours > 0 || mins > 0) parts.push(`${mins}м`);
  parts.push(`${secs}с`);
  return parts.join(' ');
}

// Tiny pluralization helper — currently used only for days.
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
