import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { isCampOver } from '@vklube/shared';
import { useAuthStore } from '../store/auth';
import { useSyncStore } from '../store/sync';
import { usePwaStore } from '../store/pwa';
import { OfflineBanner } from './OfflineBanner';
import { ThemeSwitcher } from './ThemeSwitcher';
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

  const campOver = isCampOver();

  const [tapCount, setTapCount] = useState(0);
  const [tapKey, setTapKey] = useState(0);
  const [unlocked, setUnlocked] = useState(() => {
    try { return localStorage.getItem('easter:13453x') === '1'; } catch { return false; }
  });
  const [glitching, setGlitching] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const tapResetTimer = useRef<number | null>(null);

  const handleLogoTap = () => {
    setTapKey((k) => k + 1);
    if (unlocked) return;
    setTapCount((c) => {
      const next = c + 1;
      if (next >= 7) {
        setGlitching(true);
        setShowSecret(true);
        try { localStorage.setItem('easter:13453x', '1'); } catch { /* ignore */ }
        setUnlocked(true);
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          try { navigator.vibrate([30, 50, 30, 50, 100]); } catch { /* ignore */ }
        }
        window.setTimeout(() => setGlitching(false), 1500);
        window.setTimeout(() => setShowSecret(false), 4500);
        return 0;
      }
      return next;
    });
    if (tapResetTimer.current) window.clearTimeout(tapResetTimer.current);
    tapResetTimer.current = window.setTimeout(() => setTapCount(0), 1500);
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <NavLink
          to="/"
          className={`${styles.logo} ${glitching ? styles.logoGlitch : ''} ${unlocked ? styles.logoUnlocked : ''}`}
          style={{ ['--tap-level' as string]: String(tapCount) } as React.CSSProperties}
          onClick={handleLogoTap}
        >
          <span key={`a-${tapKey}`} className={styles.logoPulse}>
            {unlocked ? (
              '13453X'
            ) : (
              <>
                <span className={styles.logoFull}>Вастрик</span>
                <span className={styles.logoShort}>Вас3к</span>
              </>
            )}
          </span>
          <Logo/>
          <span key={`b-${tapKey}`} className={styles.logoPulse}>
            {unlocked ? (
              null
            ) : (
              <>
                <span className={styles.logoFull}>ВКлубе</span>
                <span className={styles.logoShort}>ВК</span>
              </>
            )}
          </span>
        </NavLink>
        {showSecret && (
          <div className={styles.secretToast} role="status" aria-live="polite">
            👾 Secret unlocked
          </div>
        )}
        {user && (
          <div className={styles.headerUser}>
            {user.camp_username ? (
              <NavLink
                to={`/${user.camp_username}`}
                className={styles.headerUserLink}
                aria-label="Мой профиль"
                title="Мой профиль"
              >
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name}
                    className={styles.headerAvatar}
                  />
                )}
                <span className={styles.headerName}>{user.display_name}</span>
              </NavLink>
            ) : (
              <>
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name}
                    className={styles.headerAvatar}
                  />
                )}
                <span className={styles.headerName}>{user.display_name}</span>
              </>
            )}

            <div className={styles.headerMenu}>
              <NavLink
                to="/about"
                className={styles.headerAbout}
                title="Как пользоваться"
                aria-label="Как пользоваться"
              >
                ℹ️ Что это?
              </NavLink>
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
                    <ThemeSwitcher />
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
            <NavLink to="/witness" className={navLinkClass}>
              <span className={styles.navIcon}>👁️</span>
              Свидетель
            </NavLink>
          </li>
          <li>
            <NavLink to="/leaderboard" className={navLinkClass}>
              <span className={styles.navIcon}>🏆</span>
              Рейтинг
            </NavLink>
          </li>
          <li>
            {campOver ? (
              <NavLink to="/recap" className={navLinkClass}>
                <span className={styles.navIcon}>📊</span>
                Итоги
              </NavLink>
            ) : (
              <span
                className={`${styles.navLink} ${styles.navLinkDisabled}`}
                aria-disabled="true"
                title="Откроется после кэмпа"
              >
                <span className={styles.navIcon}>🔒</span>
                Итоги
              </span>
            )}
          </li>
        </ul>
      </nav>
    </div>
  );
}

export function Logo() {
  return (
      <span className={styles.logoSign}>+</span>
  );
}