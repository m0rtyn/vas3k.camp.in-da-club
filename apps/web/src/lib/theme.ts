/**
 * Theme is a combination of:
 *   - `theme`: 'system' | 'dark' | 'light'
 *   - `highContrast`: boolean (modifier on top of base theme)
 *
 * Applied to <html> as `data-theme` and `data-contrast` attributes,
 * plus `<meta name="theme-color">` for native UI chrome.
 */

export type ThemeMode = 'system' | 'dark' | 'light' | 'pipboy';
export type ResolvedTheme = 'dark' | 'light' | 'pipboy';

export const THEME_STORAGE_KEY = 'vklube-theme';

const META_COLORS: Record<ResolvedTheme, { normal: string; contrast: string }> = {
  dark: { normal: '#1a1a1a', contrast: '#000000' },
  light: { normal: '#ffffff', contrast: '#ffffff' },
  pipboy: { normal: '#0b1410', contrast: '#0b1410' },
};

export function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function resolveSystemHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return resolveSystemTheme();
  return mode;
}

export function applyTheme(mode: ThemeMode, highContrast: boolean): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(mode);
  const root = document.documentElement;

  root.setAttribute('data-theme', resolved);
  // Pip-Boy theme ignores the high-contrast modifier (its palette is already extreme).
  const effectiveContrast = resolved === 'pipboy' ? false : highContrast;
  if (effectiveContrast) {
    root.setAttribute('data-contrast', 'more');
  } else {
    root.removeAttribute('data-contrast');
  }

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    const palette = META_COLORS[resolved];
    meta.setAttribute('content', effectiveContrast ? palette.contrast : palette.normal);
  }
}
