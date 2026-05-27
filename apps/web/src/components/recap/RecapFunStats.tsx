import { formatLocalTime, formatRussianDate, type FunStats } from '../../lib/recap/funStats';
import styles from './RecapFunStats.module.css';

interface Props {
  stats: FunStats;
}

export function RecapFunStats({ stats }: Props) {
  const items: Array<{ emoji: string; label: string; value: string } | null> = [];

  if (stats.mostActiveDay) {
    items.push({
      emoji: '🔥',
      label: 'Самый активный день',
      value: `${formatRussianDate(stats.mostActiveDay.date)} — ${stats.mostActiveDay.count} встреч`,
    });
  }

  if (stats.latestNightMeeting?.meeting.confirmed_at) {
    items.push({
      emoji: '🌙',
      label: 'Самая поздняя встреча',
      value: formatLocalTime(stats.latestNightMeeting.meeting.confirmed_at),
    });
  }

  if (stats.earliestMorningMeeting?.meeting.confirmed_at) {
    items.push({
      emoji: '🌅',
      label: 'Самая ранняя встреча',
      value: formatLocalTime(stats.earliestMorningMeeting.meeting.confirmed_at),
    });
  }

  if (stats.firstMeeting?.confirmed_at) {
    items.push({
      emoji: '⚡',
      label: 'Первая встреча',
      value: formatRussianDate(stats.firstMeeting.confirmed_at.slice(0, 10)),
    });
  }

  if (stats.avgGapHours != null) {
    items.push({
      emoji: '⏱️',
      label: 'Средний интервал',
      value: stats.avgGapHours < 1
        ? `${Math.round(stats.avgGapHours * 60)} мин`
        : `~${stats.avgGapHours.toFixed(1)} ч`,
    });
  }

  if (stats.totalAll > 0) {
    items.push({
      emoji: '🎯',
      label: 'Доля подтверждённых',
      value: `${Math.round(stats.confirmedRatio * 100)}%`,
    });
  }

  const visible = items.filter((x): x is NonNullable<typeof x> => x != null);

  if (visible.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Любопытные факты</h2>
      <div className={styles.grid}>
        {visible.map((item, i) => (
          <div key={i} className={styles.card}>
            <div className={styles.emoji}>{item.emoji}</div>
            <div className={styles.label}>{item.label}</div>
            <div className={styles.value}>{item.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
