import styles from './ProfileCard.module.css';

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
      {avatar_url ? (
        <img src={avatar_url} alt={display_name} className={styles.avatar} />
      ) : (
        <div className={styles.avatarPlaceholder}>
          {display_name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className={styles.name}>{display_name}</div>
      <a
        href={`https://vas3k.club/user/${username}/`}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.username}
      >
        @{username} ↗
      </a>
      {isOwnProfile && (
        <div className={styles.campUsername} title="Ваш ВКлубный юзернейм. Зашит в NFC-чипе.">
          ВКлубный: <code>@{camp_username}</code>
        </div>
      )}
      {bio && <div className={styles.bio}>{bio}</div>}
    </div>
  );
}
