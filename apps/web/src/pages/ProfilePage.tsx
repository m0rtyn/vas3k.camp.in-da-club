import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useMeetingsStore } from '../store/meetings';
import { api } from '../lib/api';
import { getUserByCampUsername, saveUser } from '../lib/db';
import { ProfileCard } from '../components/ProfileCard';
import { MeetButton } from '../components/MeetButton';
import type { User } from '@vklube/shared';
import styles from './ProfilePage.module.css';

export function ProfilePage() {
  const { campUsername } = useParams<{ campUsername: string }>();
  const { user: currentUser } = useAuthStore();
  const { fetchMeetings } = useMeetingsStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.camp_username === campUsername;

  useEffect(() => {
    if (!campUsername) return;

    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);

      // Try IndexedDB cache first
      const cached = await getUserByCampUsername(campUsername);
      if (cached) {
        setProfile(cached);
        setIsLoading(false);
      }

      // Fetch from API if online
      if (navigator.onLine) {
        try {
          const data = await api.get<User>(`/users/${campUsername}`);
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
  }, [campUsername, fetchMeetings]);

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
        camp_username={profile.camp_username}
        display_name={profile.display_name}
        avatar_url={profile.avatar_url}
        bio={profile.bio}
        isOwnProfile={isOwnProfile}
      />

      {isOwnProfile ? (
        <div className={styles.ownProfileBadge}>Это твой профиль</div>
      ) : (
        <MeetButton
          targetUsername={profile.username}
          targetCampUsername={profile.camp_username}
        />
      )}
    </div>
  );
}
