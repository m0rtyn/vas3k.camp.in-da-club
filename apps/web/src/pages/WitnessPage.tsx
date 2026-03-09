import styles from './WitnessPage.module.css';

export function WitnessPage() {
  return (
    <div className={styles.page}>
      <div className={styles.icon}>👁</div>
      <div className={styles.title}>Свидетель</div>
      <div className={styles.description}>
        Эта функция появится в следующей версии.
        <br />
        Здесь можно будет подтверждать знакомства других участников.
      </div>
    </div>
  );
}
