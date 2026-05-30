import type { Achievement } from '../../lib/recap/achievements';
import styles from './RecapAchievements.module.css';

interface Props {
  achievements: Achievement[];
}

export function RecapAchievements({ achievements }: Props) {
  if (achievements.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.title}>Ачивки</h2>
        <p className={styles.empty}>В этот раз без значков. В следующий кэмп — больше попыток.</p>
      </section>
    );
  }

  const mine = achievements.filter((a) => a.earnedByMe);
  const others = achievements.filter((a) => !a.earnedByMe);

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Ачивки</h2>
      {mine.length > 0 && (
        <>
          <p className={styles.subtitle}>Твои:</p>
          <div className={styles.grid}>
            {mine.map((a) => (
              <Card key={a.id} ach={a} />
            ))}
          </div>
        </>
      )}
      {others.length > 0 && (
        <>
          <p className={styles.subtitle} style={{ marginTop: 24 }}>
            Кэмповые рекорды:
          </p>
          <div className={styles.grid}>
            {others.map((a) => (
              <Card key={a.id} ach={a} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Card({ ach }: { ach: Achievement }) {
  return (
    <div
      className={`${styles.card} ${ach.earnedByMe ? styles.cardEarned : ''} ${
        ach.scope === 'global' ? styles.cardGlobal : ''
      }`}
    >
      <div className={styles.emoji}>{ach.emoji}</div>
      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>
          {ach.title}
          {ach.scope === 'global' && <span className={styles.badge}>1/1</span>}
        </div>
        <div className={styles.cardDesc}>{ach.description}</div>
        {ach.value && <div className={styles.cardValue}>{ach.value}</div>}
        {ach.holder && !ach.earnedByMe && (
          <div className={styles.holder}>держит: @{ach.holder.username}</div>
        )}
      </div>
    </div>
  );
}
