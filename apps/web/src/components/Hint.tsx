import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Hint.module.css';

/**
 * Inline pop-over hint built on native <details>.
 * Trigger renders inline inside the surrounding text; body is positioned
 * absolutely so expanding the hint doesn't shift the step content below.
 * Closes on outside click or Escape.
 */
export function Hint({ label, children }: { label: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (!el.open) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      el.open = false;
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && el.open) el.open = false;
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <details ref={ref} className={styles.hint}>
      <summary className={styles.hintTrigger}>{label}</summary>
      <span className={styles.hintBody}>{children}</span>
    </details>
  );
}
