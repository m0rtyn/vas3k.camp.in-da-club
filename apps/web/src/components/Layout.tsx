import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { useSyncStore } from '../store/sync';
import { OfflineBanner } from './OfflineBanner';
import styles from './Layout.module.css';

export function Layout() {
  const { user, isLoading, isAuthenticated, fetchMe, logout } = useAuthStore();
  const initSync = useSyncStore((s) => s.init);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    return initSync();
  }, [initSync]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <NavLink to="/" className={styles.logo}>
          ВКлубе
        </NavLink>
        {user && (
          <div className={styles.headerUser}>
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.display_name}
                className={styles.headerAvatar}
              />
            )}
            <span>{user.display_name}</span>
            <button
              className={styles.logoutButton}
              onClick={() => { logout(); window.location.href = '/login'; }}
              title="Выйти"
            >
              ↩
            </button>
          </div>
        )}
      </header>

      <OfflineBanner />

      <main className={styles.main}>
        {isLoading ? (
          <p>Загрузка...</p>
        ) : (
          <Outlet />
        )}
      </main>

      <nav className={styles.nav}>
        <ul className={styles.navList}>
          <li>
            <NavLink to="/" className={navLinkClass} end>
              <span className={styles.navIcon}>🏠</span>
              Главная
            </NavLink>
          </li>
          <li>
            <NavLink to="/contacts" className={navLinkClass}>
              <span className={styles.navIcon}>👥</span>
              Контакты
            </NavLink>
          </li>
          <li>
            <NavLink to="/leaderboard" className={navLinkClass}>
              <span className={styles.navIcon}>🏆</span>
              Рейтинг
            </NavLink>
          </li>
          <li>
            <NavLink to="/witness" className={navLinkClass}>
              <span className={styles.navIcon}>👁</span>
              Свидетель
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
}
