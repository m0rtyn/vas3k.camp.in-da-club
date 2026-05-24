/**
 * Theme is a combination of:
 *   - `theme`: 'system' | 'dark' | 'light'
 *   - `highContrast`: boolean (modifier on top of base theme)
 *
 * Applied to <html> as `data-theme` and `data-contrast` attributes,
 * plus `<meta name="theme-color">` for native UI chrome.
 */

export type ThemeMode = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'vklube-theme';

const META_COLORS: Record<ResolvedTheme, { normal: string; contrast: string }> = {
  dark: { normal: '#1a1a1a', contrast: '#000000' },
  light: { normal: '#ffffff', contrast: '#ffffff' },
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
  return mode === 'system' ? resolveSystemTheme() : mode;
}

export function applyTheme(mode: ThemeMode, highContrast: boolean): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(mode);
  const root = document.documentElement;

  root.setAttribute('data-theme', resolved);
  if (highContrast) {
    root.setAttribute('data-contrast', 'more');
  } else {
    root.removeAttribute('data-contrast');
  }

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    const palette = META_COLORS[resolved];
    meta.setAttribute('content', highContrast ? palette.contrast : palette.normal);
  }
}
