import { useSyncStore } from '../store/sync';
import styles from './OfflineBanner.module.css';

export function OfflineBanner() {
  const { isOnline, pendingCount } = useSyncStore();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={styles.banner}>
      {!isOnline && '📡 Нет сети. '}
      {pendingCount > 0 && `${pendingCount} действий ожидают синхронизации`}
    </div>
  );
}
