import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AuthGuard } from '../components/AuthGuard';
import type { LeaderboardEntry } from '@vklube/shared';
import styles from './LeaderboardPage.module.css';

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<LeaderboardEntry[]>('/leaderboard');
        setEntries(data);
      } catch {
        // Offline or error
      }
      setIsLoading(false);
    };
    load();
  }, []);

  return (
    <AuthGuard>
      <div className={styles.page}>
        <div className={styles.title}>🏆 Рейтинг</div>

        {isLoading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : entries.length === 0 ? (
          <div className={styles.empty}>Пока нет данных для рейтинга</div>
        ) : (
          <div className={styles.list}>
            {entries.map((entry) => (
              <div
                key={entry.rank}
                className={`${styles.row} ${entry.is_self ? styles.rowSelf : ''}`}
              >
                <div className={`${styles.rank} ${entry.rank <= 3 ? styles.rankTop3 : ''}`}>
                  {entry.rank <= 3
                    ? ['🥇', '🥈', '🥉'][entry.rank - 1]
                    : `#${entry.rank}`}
                </div>

                {entry.avatar_url ? (
                  <img src={entry.avatar_url} className={styles.avatar} alt="" />
                ) : (
                  <div className={styles.avatarPlaceholder}>?</div>
                )}

                <div className={`${styles.name} ${!entry.username ? styles.anonymous : ''}`}>
                  {entry.display_name || `Участник #${entry.rank}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
