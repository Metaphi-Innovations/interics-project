// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThemeConfig {
  brandColor: string;
  fontFamily: string;
  mode: 'light' | 'dark';
}

// ─── Font options ─────────────────────────────────────────────────────────────
// Helvetica Neue is a system font — no Google Fonts link required.
// All others are loaded via Google Fonts in index.html.

export const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Inter',             value: 'Inter' },
  { label: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans' },
  { label: 'DM Sans',           value: 'DM Sans' },
  { label: 'Geist',             value: 'Geist' },
  { label: 'Manrope',           value: 'Manrope' },
  { label: 'Poppins',           value: 'Poppins' },
  { label: 'Helvetica',         value: 'Helvetica Neue' },
];

// ─── Color presets ────────────────────────────────────────────────────────────

export const COLOR_PRESETS: { label: string; value: string }[] = [
  { label: 'Teal',   value: '#107E68' },
  { label: 'Indigo', value: '#6366F1' },
  { label: 'Violet', value: '#7C3AED' },
  { label: 'Blue',   value: '#2563EB' },
  { label: 'Green',  value: '#059669' },
  { label: 'Orange', value: '#EA580C' },
  { label: 'Rose',   value: '#E11D48' },
  { label: 'Slate',  value: '#475569' },
];

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  brandColor: '#107E68',
  fontFamily: 'Poppins',
  mode: 'light',
};

// ─── Persistence ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'foundation:theme';

export function saveThemeConfig(config: ThemeConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function loadThemeConfig(): ThemeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THEME_CONFIG;

    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).brandColor !== 'string' ||
      typeof (parsed as Record<string, unknown>).fontFamily !== 'string' ||
      ((parsed as Record<string, unknown>).mode !== 'light' &&
       (parsed as Record<string, unknown>).mode !== 'dark')
    ) {
      return DEFAULT_THEME_CONFIG;
    }

    return parsed as ThemeConfig;
  } catch {
    return DEFAULT_THEME_CONFIG;
  }
}
