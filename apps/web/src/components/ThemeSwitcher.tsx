import { useThemeStore } from '../store/theme';
import type { ThemeMode } from '../lib/theme';
import styles from './ThemeSwitcher.module.css';

const OPTIONS: { value: ThemeMode; label: string; emoji: string }[] = [
  { value: 'system', label: 'Авто', emoji: '🖥️' },
  { value: 'light', label: 'Светлая', emoji: '☀️' },
  { value: 'dark', label: 'Тёмная', emoji: '🌙' },
];

export function ThemeSwitcher() {
  const theme = useThemeStore((s) => s.theme);
  const highContrast = useThemeStore((s) => s.highContrast);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setHighContrast = useThemeStore((s) => s.setHighContrast);

  return (
    <div className={styles.wrapper}>
      <div className={styles.label}>Тема</div>
      <div className={styles.segmented} role="radiogroup" aria-label="Выбор темы">
        {OPTIONS.map((opt) => {
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              className={`${styles.segment} ${active ? styles.segmentActive : ''}`}
              onClick={() => setTheme(opt.value)}
              title={opt.label}
            >
              <span className={styles.segmentEmoji} aria-hidden>
                {opt.emoji}
              </span>
              <span className={styles.segmentText}>{opt.label}</span>
            </button>
          );
        })}
      </div>

      <label className={styles.contrastRow}>
        <input
          type="checkbox"
          checked={highContrast}
          onChange={(e) => setHighContrast(e.target.checked)}
          className={styles.checkbox}
        />
        <span className={styles.contrastLabel}>
          <span aria-hidden>🔆</span> Контрастный режим
        </span>
      </label>
    </div>
  );
}
