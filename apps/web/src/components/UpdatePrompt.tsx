import { usePwaStore } from '../store/pwa';
import styles from './UpdatePrompt.module.css';

export function UpdatePrompt() {
  const { needRefresh, offlineReady, acceptUpdate, dismissUpdate, dismissOfflineReady } =
    usePwaStore();

  if (offlineReady) {
    return (
      <div className={styles.toast}>
        <span>Приложение готово к работе офлайн</span>
        <button className={styles.dismiss} onClick={dismissOfflineReady}>
          ✕
        </button>
      </div>
    );
  }

  if (!needRefresh) return null;

  return (
    <div className={styles.toast}>
      <span>Доступна новая версия</span>
      <div className={styles.actions}>
        <button className={styles.update} onClick={acceptUpdate}>
          Обновить
        </button>
        <button className={styles.dismiss} onClick={dismissUpdate}>
          Позже
        </button>
      </div>
    </div>
  );
}
