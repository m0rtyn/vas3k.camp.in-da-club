import { useMemo, useState } from 'react';
import {
  copyToClipboard,
  formatProfilesText,
  type ProfileEntry,
} from '../../lib/recap/exportProfiles';
import styles from './RecapExport.module.css';

interface Props {
  profiles: ProfileEntry[];
}

export function RecapExport({ profiles }: Props) {
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => formatProfilesText(profiles), [profiles]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  if (profiles.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Список контактов</h2>
      <p className={styles.subtitle}>
        {profiles.length} {pluralize(profiles.length, ['контакт', 'контакта', 'контактов'])} с
        подтверждёнными встречами, в порядке знакомства.
      </p>

      <ol className={styles.list} aria-label="Список профилей">
        {profiles.map((p) => (
          <li key={p.username} className={styles.item}>
            <span className={styles.name}>{p.label}</span>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              {p.url.replace(/^https?:\/\//, '')}
            </a>
            {p.telegramUrl && (
              <a
                href={p.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.telegram}
              >
                TG: @{p.telegram}
              </a>
            )}
          </li>
        ))}
      </ol>

      <button className={styles.button} onClick={handleCopy}>
        {copied ? '✓ Скопировано' : '📋 Скопировать список знакомств'}
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
