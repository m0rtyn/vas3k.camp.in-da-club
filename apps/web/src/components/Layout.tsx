import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useSyncStore } from '../store/sync';
import { usePwaStore } from '../store/pwa';
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

  const resetServiceWorker = usePwaStore((s) => s.resetServiceWorker);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const navigate = useNavigate();
  const loggingOut = useRef(false);
  const handleLogout = async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    await logout();
    navigate('/login', { replace: true });
  };

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
            <div className={styles.menuWrapper} ref={menuRef}>
              <button
                className={styles.menuButton}
                onClick={() => setShowMenu((v) => !v)}
                title="Меню"
              >
                ⋮
              </button>
              {showMenu && (
                <div className={styles.menu}>
                  <button className={styles.menuItem} onClick={resetServiceWorker}>
                    🔄 Сбросить кэш
                  </button>
                  <button className={styles.menuItem} onClick={handleLogout}>
                    ↩ Выйти
                  </button>
                </div>
              )}
            </div>
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
            <span className={`${styles.navLink} ${styles.navLinkDisabled}`}>
              <span className={styles.navIcon}>👁</span>
              Свидетель
            </span>
          </li>
        </ul>
      </nav>
    </div>
  );
}
