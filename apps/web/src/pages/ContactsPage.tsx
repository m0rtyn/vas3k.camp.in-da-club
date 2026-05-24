import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useMeetingsStore } from '../store/meetings';
import { ContactListItem } from '../components/ContactListItem';
import { AuthGuard } from '../components/AuthGuard';
import styles from './ContactsPage.module.css';

type Filter = 'all' | 'confirmed' | 'unconfirmed';

export function ContactsPage() {
  const { user } = useAuthStore();
  const { meetings, fetchMeetings, cancelMeeting } = useMeetingsStore();
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const visible = meetings.filter(
    (m) => m.status !== 'cancelled' && !m.is_hidden_by_me,
  );

  const filtered = visible.filter((m) => {
    if (filter === 'confirmed') return m.status === 'confirmed';
    if (filter === 'unconfirmed') return m.status === 'unconfirmed';
    return true;
  });

  return (
    <AuthGuard>
      <div className={styles.page}>
        <div className={styles.title}>Контакты</div>

        <div className={styles.filters}>
          {(['all', 'confirmed', 'unconfirmed'] as Filter[]).map((f) => (
            <button
              key={f}
              className={`${styles.filterButton} ${filter === f ? styles.filterButtonActive : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' && `Все (${visible.length})`}
              {f === 'confirmed' && `Подтверждённые (${visible.filter((m) => m.status === 'confirmed').length})`}
              {f === 'unconfirmed' && `Без подтверждения (${visible.filter((m) => m.status === 'unconfirmed').length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            {filter === 'all'
              ? 'Пока нет контактов'
              : `Нет контактов с фильтром "${filter}"`}
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map((meeting) => (
              <ContactListItem
                key={meeting.id}
                meeting={meeting}
                currentUsername={user!.username}
                onCancel={cancelMeeting}
              />
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
