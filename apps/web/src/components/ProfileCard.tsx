import { useState } from 'react';
import { Hint } from './Hint';
import styles from './ProfileCard.module.css';

const COPY_FEEDBACK_MS = 1500;
const CLUB_PROFILE_URL = 'https://vas3k.club/user';

interface ProfileCardProps {
  /** Club slug — primary display identifier (@username) and vas3k.club deep-link. */
  username: string;
  /** Camp username — shown only on the user's own profile so they know what's on their NFC chip. */
  camp_username: string;
  display_name: string;
  avatar_url: string;
  bio?: string | null;
  /** When true, the camp_username section is rendered. */
  isOwnProfile?: boolean;
}

export function ProfileCard({
  username,
  camp_username,
  display_name,
  avatar_url,
  bio,
  isOwnProfile = false,
}: ProfileCardProps) {
  return (
    <div className={styles.card}>
      <Avatar src={avatar_url} displayName={display_name} />
      <div className={styles.name}>{display_name}</div>
      <span>
        Клубный профиль:{' '}
        <a
          href={`${CLUB_PROFILE_URL}/${username}/`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.username}
        >
          @{username} ↗
        </a>
      </span>
      {isOwnProfile && <CampUsername value={camp_username} />}
      {bio && <div className={styles.bio}>{bio}</div>}
    </div>
  );
}

function Avatar({ src, displayName }: { src: string; displayName: string }) {
  if (src) {
    return <img src={src} alt={displayName} className={styles.avatar} />;
  }
  return (
    <div className={styles.avatarPlaceholder}>
      {displayName.charAt(0).toUpperCase()}
    </div>
  );
}

function CampUsername({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // clipboard API can fail on insecure contexts or denied permissions — fail silently
    }
  };

  return (
    <div className={styles.campUsername}>
      Твой юзернейм
      <Hint label="">
        Используется для добавления в контакты. Зашит в NFC-чипе.
      </Hint>
      :{' '}
      <button
        type="button"
        onClick={handleCopy}
        className={styles.copyButton}
        title="Скопировать юзернейм"
        aria-label="Скопировать юзернейм"
      >
        <code>@{value}</code>
      </button>
      <span className={styles.copyHint} aria-live="polite">
        {copied ? '✅' : '📄'}
      </span>
    </div>
  );
}
