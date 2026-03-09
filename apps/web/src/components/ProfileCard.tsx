import styles from './ProfileCard.module.css';

interface ProfileCardProps {
  username: string;
  display_name: string;
  avatar_url: string;
  bio?: string | null;
}

export function ProfileCard({ username, display_name, avatar_url, bio }: ProfileCardProps) {
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
      <div className={styles.username}>@{username}</div>
      {bio && <div className={styles.bio}>{bio}</div>}
    </div>
  );
}
