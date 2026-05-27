import styles from './RecapHero.module.css';

interface RecapHeroProps {
  displayName: string;
  totalConfirmed: number;
  uniquePeople: number;
  witnessedCount: number;
}

export function RecapHero({
  displayName,
  totalConfirmed,
  uniquePeople,
  witnessedCount,
}: RecapHeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.kicker}>Итоги ВКлубе</div>
      <h1 className={styles.title}>
        {displayName}, вот твой <span className={styles.accent}>кэмп</span> в цифрах
      </h1>

      <div className={styles.bigStats}>
        <div className={styles.bigStat}>
          <div className={styles.bigNumber}>{totalConfirmed}</div>
          <div className={styles.bigLabel}>подтверждённых встреч</div>
        </div>
        <div className={styles.bigStat}>
          <div className={styles.bigNumber}>{uniquePeople}</div>
          <div className={styles.bigLabel}>уникальных людей</div>
        </div>
        <div className={styles.bigStat}>
          <div className={styles.bigNumber}>{witnessedCount}</div>
          <div className={styles.bigLabel}>раз был свидетелем</div>
        </div>
      </div>

      <div className={styles.scrollHint}>
        ↓ листай дальше
      </div>
    </section>
  );
}
