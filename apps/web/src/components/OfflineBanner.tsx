import { useSyncStore } from '../store/sync';
import styles from './OfflineBanner.module.css';

export function OfflineBanner() {
  const { isOnline, pendingCount, lastSyncError, retrySync } = useSyncStore();

  if (isOnline && pendingCount === 0 && !lastSyncError) return null;

  return (
    <div className={`${styles.banner} ${lastSyncError ? styles.error : ''}`}>
      {!isOnline && '📡 Нет сети. '}
      {lastSyncError && (
        <>
          ⚠️ Ошибка синхронизации{' '}
          <button className={styles.retryButton} onClick={retrySync}>
            Повторить
          </button>
        </>
      )}
      {!lastSyncError && pendingCount > 0 && `${pendingCount} действий ожидают синхронизации`}
    </div>
  );
}
