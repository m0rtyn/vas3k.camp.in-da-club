import { Link } from 'react-router-dom';
import { WormGame } from '../components/WormGame';
import styles from './NotFoundPage.module.css';

interface NotFoundPageProps {
  /** Optional message — overrides the default "user not found" copy. */
  message?: string | null;
  /** camp_username from the URL, shown in the subtitle for context. */
  campUsername?: string;
}

export function NotFoundPage({ message, campUsername }: NotFoundPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.title}>🪱 Червяк запутался</div>
      <div className={styles.subtitle}>
        {message ? (
          message
        ) : campUsername ? (
          <>
            Профиль <span className={styles.username}>@{campUsername}</span> не найден.
            Если нечего делать — помоги червячку доползти до дома.
          </>
        ) : (
          <>Страница не найдена. Если нечего делать — помоги червяку доползти до дома.</>
        )}
      </div>
      <WormGame />
      <Link to="/" className={styles.back}>
        ← На главную
      </Link>
    </div>
  );
}
