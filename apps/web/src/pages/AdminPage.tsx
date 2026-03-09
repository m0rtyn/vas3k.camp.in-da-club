import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { AuthGuard } from '../components/AuthGuard';
import { useAuthStore } from '../store/auth';
import styles from './AdminPage.module.css';

interface EventStats {
  total_users: number;
  confirmed_meetings: number;
  unconfirmed_meetings: number;
  cancelled_meetings: number;
  meetings_last_24h: number;
  total_approvals_available: number;
}

export function AdminPage() {
  const { user } = useAuthStore();
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('1');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState<EventStats | null>(null);

  useEffect(() => {
    api.get<EventStats>('/admin/stats').then(setStats).catch(() => {});
  }, []);

  if (!user?.is_admin) {
    return (
      <AuthGuard>
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
          Доступ только для администраторов
        </div>
      </AuthGuard>
    );
  }

  const handleGrant = async (target: string) => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      await api.post('/admin/grants', { username: target, amount: Number(amount) });
      setMessage({
        type: 'success',
        text: target === '__all__'
          ? `+${amount} апрувов для всех`
          : `+${amount} апрувов для @${target}`,
      });
      setUsername('');
      // Refresh stats
      api.get<EventStats>('/admin/stats').then(setStats).catch(() => {});
    } catch {
      setMessage({ type: 'error', text: 'Ошибка при выдаче апрувов' });
    }
    setIsSubmitting(false);
  };

  return (
    <AuthGuard>
      <div className={styles.page}>
        <div className={styles.title}>⚙️ Админ-панель</div>

        {stats && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Статистика</div>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{stats.total_users}</div>
                <div className={styles.statLabel}>Пользователей</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{stats.confirmed_meetings}</div>
                <div className={styles.statLabel}>Подтверждено</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{stats.unconfirmed_meetings}</div>
                <div className={styles.statLabel}>Не подтверждено</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{stats.meetings_last_24h}</div>
                <div className={styles.statLabel}>За 24ч</div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Выдать апрувы</div>
          <div className={styles.form}>
            <div className={styles.inputGroup}>
              <input
                type="text"
                className={styles.input}
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                type="number"
                className={styles.input}
                style={{ maxWidth: 80 }}
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <button
              className={styles.submitButton}
              disabled={isSubmitting || !username}
              onClick={() => handleGrant(username)}
            >
              Выдать
            </button>
            <button
              className={styles.submitButton}
              disabled={isSubmitting}
              onClick={() => handleGrant('__all__')}
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
              Выдать всем
            </button>

            {message && (
              <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
                {message.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
