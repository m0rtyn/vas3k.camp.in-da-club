import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { INITIAL_APPROVALS, CONTACTS_PER_APPROVAL } from '@vklube/shared';
import { useAuthStore } from '../store/auth';
import { useMeetingsStore } from '../store/meetings';
import { ContactListItem } from '../components/ContactListItem';
import { Hint } from '../components/Hint';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { meetings, isLoading, fetchMeetings, cancelMeeting } = useMeetingsStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchMeetings();
    }
  }, [isAuthenticated, fetchMeetings]);

  if (!isAuthenticated || !user) {
    return (
      <div className={styles.loginPrompt}>
        <div className={styles.loginPromptTitle}>👋 ВКлубе</div>
        <div className={styles.loginPromptSubtitle}>
          NFC нетворкинг для Vas3k.Camp.
          <br />
          Войдите, чтобы начать записывать знакомства.
        </div>
        <a href="/api/auth/login" className={styles.loginButton}>
          Войти через vas3k.club
        </a>
      </div>
    );
  }

  const visibleMeetings = meetings.filter(
    (m) => m.status !== 'cancelled' && !m.is_hidden_by_me,
  );
  const confirmedCount = visibleMeetings.filter((m) => m.status === 'confirmed').length;
  const totalCount = visibleMeetings.length;
  const recentMeetings = visibleMeetings.slice(0, 5);

  return (
    <div className={styles.page}>
      <div className={styles.greeting}>
        Привет, {user.display_name} 👋
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{totalCount}</div>
          <div className={styles.statLabel}>Встречи</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{confirmedCount}</div>
          <div className={styles.statLabel}>Подтверждено</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{user.approvals_available}</div>
          <div className={styles.statLabel}>
            <Hint label="Апрувов">
              Апрувы нужны на подтверждение контактов. Их тратит свидетель. Всем на старте выдаётся по {INITIAL_APPROVALS} апрувов,
              а затем по одному за каждые {CONTACTS_PER_APPROVAL} новых знакомства — обоим участникам встречи.
            </Hint>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Недавние контакты</div>
        {isLoading ? (
          <p>Загрузка...</p>
        ) : recentMeetings.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Пока нет контактов. Отсканируйте NFC-чип, чтобы начать!
          </p>
        ) : (
          recentMeetings.map((meeting) => (
            <ContactListItem
              key={meeting.id}
              meeting={meeting}
              currentUsername={user.username}
              onCancel={cancelMeeting}
            />
          ))
        )}
        {visibleMeetings.length > 5 && (
          <Link to="/contacts" style={{ textAlign: 'center', fontSize: 14 }}>
            Все контакты →
          </Link>
        )}
      </div>
    </div>
  );
}
