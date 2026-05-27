import type { RecapStats } from '@vklube/shared';
import styles from './RecapComparison.module.css';

interface Props {
  myCount: number;
  stats: RecapStats | null;
  isLoading: boolean;
  isOffline: boolean;
}

export function RecapComparison({ myCount, stats, isLoading, isOffline }: Props) {
  if (isOffline && !stats) {
    return (
      <section className={styles.section}>
        <h2 className={styles.title}>Сравнение с кэмпом</h2>
        <div className={styles.offline}>
          Подключись к сети, чтобы увидеть, как ты выглядишь на фоне остальных.
        </div>
      </section>
    );
  }

  if (isLoading || !stats) {
    return (
      <section className={styles.section}>
        <h2 className={styles.title}>Сравнение с кэмпом</h2>
        <div className={styles.skeleton} aria-hidden="true" />
        <div className={styles.skeleton} aria-hidden="true" />
      </section>
    );
  }

  const max = Math.max(stats.p90, myCount, 1);
  const myPct = (myCount / max) * 100;
  const medPct = (stats.median / max) * 100;
  const meanPct = (stats.mean / max) * 100;

  // Approximate percentile: where does myCount fall vs known percentiles?
  let percentile: number;
  if (myCount >= stats.p90) percentile = 90;
  else if (myCount >= stats.p75) percentile = 75;
  else if (myCount >= stats.median) percentile = 50;
  else if (myCount >= stats.p25) percentile = 25;
  else percentile = 10;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Сравнение с кэмпом</h2>
      <p className={styles.subtitle}>
        Среди {stats.total_participants} участников с хотя бы одной встречей.
      </p>

      <div className={styles.bars}>
        <Row label="Ты" value={myCount} pct={myPct} highlight />
        <Row label="Медиана" value={fmt(stats.median)} pct={medPct} />
        <Row label="Среднее" value={fmt(stats.mean)} pct={meanPct} />
      </div>

      <div className={styles.callout}>
        Ты в районе <strong>{percentile}-го перцентиля</strong> по числу контактов.
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  pct,
  highlight,
}: {
  label: string;
  value: number | string;
  pct: number;
  highlight?: boolean;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLabel}>{label}</div>
      <div className={styles.barTrack}>
        <div
          className={`${styles.barFill} ${highlight ? styles.barFillMe : ''}`}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      <div className={styles.rowValue}>{value}</div>
    </div>
  );
}

function fmt(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}
