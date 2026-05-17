import { useState, useEffect } from 'react';
import { isStandalone, isDismissedWithCooldown, dismissWithCooldown } from '../lib/pwa-utils';
import styles from './IosInstallHint.module.css';

const IOS_HINT_DISMISSED_KEY = 'pwa-ios-hint-dismissed';
const DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

export function IosInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isIos() && !isStandalone() && !isDismissedWithCooldown(IOS_HINT_DISMISSED_KEY, DISMISS_COOLDOWN_MS)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    dismissWithCooldown(IOS_HINT_DISMISSED_KEY);
    setVisible(false);
  };

  return (
    <div className={styles.hint}>
      <span>
        Установите приложение: нажмите{' '}
        <span className={styles.icon}>⎙</span> внизу экрана, затем{' '}
        <strong>«На экран &ldquo;Домой&rdquo;»</strong>
      </span>
      <button className={styles.dismiss} onClick={dismiss}>
        ✕
      </button>
    </div>
  );
}
