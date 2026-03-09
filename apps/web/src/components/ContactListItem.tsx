import { Link } from 'react-router-dom';
import type { Meeting } from '@vklube/shared';
import styles from './ContactListItem.module.css';

interface ContactListItemProps {
  meeting: Meeting;
  currentUsername: string;
  onHide?: (meetingId: string) => void;
  onCancel?: (meetingId: string) => void;
}

export function ContactListItem({
  meeting,
  currentUsername,
  onHide,
  onCancel,
}: ContactListItemProps) {
  const otherUsername =
    meeting.initiator_username === currentUsername
      ? meeting.target_username
      : meeting.initiator_username;

  const isConfirmed = meeting.status === 'confirmed';
  const date = new Date(meeting.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const canCancel =
    Date.now() - new Date(meeting.created_at).getTime() < 5 * 60 * 1000;

  return (
    <div className={`${styles.item} ${!isConfirmed ? styles.unconfirmed : ''}`}>
      <div className={styles.avatarPlaceholder}>
        {otherUsername.charAt(0).toUpperCase()}
      </div>

      <Link to={`/${otherUsername}`} className={styles.info}>
        <div className={styles.name}>@{otherUsername}</div>
        <div className={styles.meta}>
          <span>{date}</span>
          <span className={`${styles.badge} ${isConfirmed ? styles.badgeConfirmed : styles.badgeUnconfirmed}`}>
            {isConfirmed ? '✓ подтверждено' : 'не подтверждено'}
          </span>
        </div>
      </Link>

      <div className={styles.actions}>
        {canCancel && onCancel && (
          <button
            className={styles.actionButton}
            onClick={() => onCancel(meeting.id)}
            title="Отменить"
          >
            ✕
          </button>
        )}
        {!canCancel && onHide && (
          <button
            className={styles.actionButton}
            onClick={() => onHide(meeting.id)}
            title="Скрыть"
          >
            👁‍🗨
          </button>
        )}
      </div>
    </div>
  );
}
