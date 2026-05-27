import { useState } from 'react';
import { copyToClipboard } from '../../lib/recap/exportProfiles';
import styles from './RecapExport.module.css';

interface Props {
  markdown: string;
  count: number;
}

export function RecapExport({ markdown, count }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(markdown);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  if (count === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Список контактов</h2>
      <p className={styles.subtitle}>
        {count} {pluralize(count, ['человек', 'человека', 'человек'])} с подтверждёнными встречами.
        Скопируй и сохрани, куда удобно.
      </p>

      <pre className={styles.preview} aria-label="Список профилей в Markdown">
        {markdown}
      </pre>

      <button className={styles.button} onClick={handleCopy}>
        {copied ? '✓ Скопировано' : '📋 Скопировать Markdown'}
      </button>
    </section>
  );
}

function pluralize(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
