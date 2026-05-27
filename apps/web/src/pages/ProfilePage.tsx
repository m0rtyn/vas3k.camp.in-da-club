import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useMeetingsStore } from '../store/meetings';
import { api } from '../lib/api';
import { getUserByCampUsername, saveUser } from '../lib/db';
import { setReturnPath } from '../lib/auth';
import { ProfileCard } from '../components/ProfileCard';
import { MeetButton } from '../components/MeetButton';
import { NotFoundPage } from './NotFoundPage';
import type { User } from '@vklube/shared';
import styles from './ProfilePage.module.css';

export function ProfilePage() {
  const { campUsername } = useParams<{ campUsername: string }>();
  const {
    user: currentUser,
    isAuthenticated,
    isLoading: isAuthLoading,
  } = useAuthStore();
  const { fetchMeetings } = useMeetingsStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.camp_username === campUsername;
  const showGuestCta = !isAuthLoading && !isAuthenticated;

  // Persist returnTo so OIDC full-page redirect brings the guest back here.
  useEffect(() => {
    if (showGuestCta && campUsername) {
      setReturnPath(`/${campUsername}`);
    }
  }, [showGuestCta, campUsername]);

  useEffect(() => {
    if (!campUsername) return;
    // Skip profile fetch for guests — backend requires auth and would 401.
    if (!isAuthenticated) return;

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
  }, [campUsername, fetchMeetings, isAuthenticated]);

  if (isAuthLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (showGuestCta) {
    return (
      <div className={styles.guestCta}>
        <div className={styles.guestTitle}>Ты почти у цели, но...</div>
        <div className={styles.guestSubtitle}>
          Чтобы добавить <span className={styles.guestUsername}>@{campUsername}</span>, войди в приложение 👇
        </div>
        <a href="/api/auth/login" className={styles.guestButton}>
          Войти через vas3k.club
        </a>
      </div>
    );
  }

  if (isLoading && !profile) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error || !profile) {
    return <NotFoundPage message={error} campUsername={campUsername} />;
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
