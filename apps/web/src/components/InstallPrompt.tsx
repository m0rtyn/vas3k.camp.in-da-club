import { useEffect } from 'react';
import { usePwaStore } from '../store/pwa';
import styles from './InstallPrompt.module.css';

export function InstallPrompt() {
  const { canInstall, promptInstall, dismissInstall, initInstallPrompt } = usePwaStore();

  useEffect(() => {
    const cleanup = initInstallPrompt();
    return cleanup;
  }, [initInstallPrompt]);

  if (!canInstall) return null;

  return (
    <div className={styles.banner}>
      <span>📲 Установите приложение для быстрого доступа</span>
      <div className={styles.actions}>
        <button className={styles.install} onClick={promptInstall}>
          Установить
        </button>
        <button className={styles.dismiss} onClick={dismissInstall}>
          ✕
        </button>
      </div>
    </div>
  );
}
