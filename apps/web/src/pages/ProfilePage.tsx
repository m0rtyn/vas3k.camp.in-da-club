import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useMeetingsStore } from '../store/meetings';
import { api } from '../lib/api';
import { getUser, saveUser } from '../lib/db';
import { ProfileCard } from '../components/ProfileCard';
import { MeetButton } from '../components/MeetButton';
import type { User } from '@vklube/shared';
import styles from './ProfilePage.module.css';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuthStore();
  const { fetchMeetings } = useMeetingsStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    if (!username) return;

    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);

      // Try IndexedDB cache first
      const cached = await getUser(username);
      if (cached) {
        setProfile(cached);
        setIsLoading(false);
      }

      // Fetch from API if online
      if (navigator.onLine) {
        try {
          const data = await api.get<User>(`/users/${username}`);
          await saveUser(data);
          setProfile(data);
        } catch {
          if (!cached) {
            setError('Пользователь не найден');
          }
        }
      } else if (!cached) {
        setError('Нет сети. Профиль не загружен.');
      }

      setIsLoading(false);
    };

    loadProfile();
    fetchMeetings();
  }, [username, fetchMeetings]);

  if (isLoading && !profile) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error || !profile) {
    return <div className={styles.notFound}>{error || 'Пользователь не найден'}</div>;
  }

  return (
    <div className={styles.page}>
      <ProfileCard
        username={profile.username}
        display_name={profile.display_name}
        avatar_url={profile.avatar_url}
        bio={profile.bio}
      />

      {isOwnProfile ? (
        <div className={styles.ownProfileBadge}>Это ваш профиль</div>
      ) : (
        <MeetButton targetUsername={profile.username} />
      )}
    </div>
  );
}
