import { create } from 'zustand';
import {
  applyTheme,
  resolveSystemHighContrast,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from '../lib/theme';

interface ThemeState {
  theme: ThemeMode;
  highContrast: boolean;
  setTheme: (theme: ThemeMode) => void;
  setHighContrast: (value: boolean) => void;
  /** Should be called once on app mount to keep DOM in sync with system changes. */
  init: () => () => void;
}

interface PersistedThemeState {
  theme: ThemeMode;
  highContrast: boolean;
}

function loadPersisted(): PersistedThemeState {
  if (typeof localStorage === 'undefined') {
    return { theme: 'system', highContrast: false };
  }
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) {
      return { theme: 'system', highContrast: resolveSystemHighContrast() };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedThemeState>;
    return {
      theme: parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : 'system',
      highContrast: Boolean(parsed.highContrast),
    };
  } catch {
    return { theme: 'system', highContrast: false };
  }
}

function persist(state: PersistedThemeState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

const initial = loadPersisted();

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial.theme,
  highContrast: initial.highContrast,

  setTheme: (theme) => {
    set({ theme });
    const { highContrast } = get();
    persist({ theme, highContrast });
    applyTheme(theme, highContrast);
  },

  setHighContrast: (highContrast) => {
    set({ highContrast });
    const { theme } = get();
    persist({ theme, highContrast });
    applyTheme(theme, highContrast);
  },

  init: () => {
    const { theme, highContrast } = get();
    applyTheme(theme, highContrast);

    if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;

    const schemeQuery = window.matchMedia('(prefers-color-scheme: light)');
    const onSchemeChange = () => {
      if (get().theme === 'system') {
        applyTheme('system', get().highContrast);
      }
    };
    schemeQuery.addEventListener('change', onSchemeChange);

    return () => {
      schemeQuery.removeEventListener('change', onSchemeChange);
    };
  },
}));
