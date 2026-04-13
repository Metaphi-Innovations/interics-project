import chroma from 'chroma-js';

// ─── Brand color ─────────────────────────────────────────────────────────────
// This is the ONLY value that changes when rebranding.
// Every color in the system derives from here.
export const BRAND_COLOR = '#107E68';

// ─── Color scale generation ───────────────────────────────────────────────────
type ColorScale = {
  50: string;  100: string; 200: string; 300: string; 400: string;
  500: string; 600: string; 700: string; 800: string; 900: string;
  950: string;
};

const SHADE_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/**
 * Generates an 11-stop perceptual color scale in Lab space.
 * The base color is pinned exactly at the 500 stop.
 */
export function generateScale(baseColor: string): ColorScale {
  const light = chroma.mix(baseColor, '#ffffff', 0.95, 'lab').hex();
  const dark  = chroma.mix(baseColor, '#000000', 0.80, 'lab').hex();

  // base sits at domain position 0.5 → maps to index 5 of 11
  const raw = chroma
    .scale([light, baseColor, dark])
    .mode('lab')
    .domain([0, 0.5, 1])
    .colors(11);

  const scale = Object.fromEntries(
    SHADE_STOPS.map((stop, i) => [stop, raw[i]])
  ) as ColorScale;

  // Pin the exact brand hex at 500 (no Lab rounding drift)
  scale[500] = chroma(baseColor).hex();
  return scale;
}

/**
 * Neutral scale: desaturate the brand hue so greys still
 * feel on-brand without being chromatic.
 */
export function generateNeutralScale(baseColor: string): ColorScale {
  const neutral = chroma(baseColor).desaturate(3).hex();
  return generateScale(neutral);
}

// ─── Color scales ─────────────────────────────────────────────────────────────
const primaryScale  = generateScale(BRAND_COLOR);
const neutralScale  = generateNeutralScale(BRAND_COLOR);
const errorScale    = generateScale('#EF4444');
const successScale  = generateScale('#10B981');
const warningScale  = generateScale('#F59E0B');
const infoScale     = generateScale('#3B82F6');

// ─── Tokens ───────────────────────────────────────────────────────────────────
export const tokens = {
  color: {
    primary: primaryScale,
    neutral: neutralScale,
    error:   errorScale,
    success: successScale,
    warning: warningScale,
    info:    infoScale,
    white:   '#ffffff',
    black:   '#000000',
  },

  spacing: {
    0:  '0px',
    1:  '4px',
    2:  '8px',
    3:  '12px',
    4:  '16px',
    5:  '20px',
    6:  '24px',
    8:  '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },

  fontSize: {
    xs:   '11px',
    sm:   '12px',
    base: '13px',
    lg:   '14px',
    xl:   '16px',
    '2xl': '18px',
    '3xl': '22px',
    '4xl': '30px',
  },

  fontWeight: {
    normal:   400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },

  lineHeight: {
    tight:   1.25,
    normal:  1.5,
    relaxed: 1.75,
  },

  borderRadius: {
    none: '0px',
    sm:   '4px',
    md:   '6px',
    lg:   '8px',
    xl:   '10px',
    '2xl': '16px',
    full: '9999px',
  },

  shadow: {
    none: 'none',
    sm:   '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md:   '0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10)',
    lg:   '0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.10)',
    xl:   '0 20px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.10)',
  },

  zIndex: {
    base:     0,
    raised:   1,
    dropdown: 1000,
    sticky:   1100,
    modal:    1300,
    toast:    1400,
    tooltip:  1500,
  },

  transition: {
    fast:   '100ms ease',
    normal: '200ms ease',
    slow:   '300ms ease',
  },
} as const;

export type Tokens = typeof tokens;

export const CHART_COLORS = {
  teal:   '#107E68',
  green:  '#10B981',
  blue:   '#3B82F6',
  amber:  '#F59E0B',
  red:    '#EF4444',
  purple: '#8B5CF6',
  grey:   '#9CA3AF',
}

export const TREND_COLORS = {
  up:      { color: '#10B981', bg: '#D1FAE5' },
  down:    { color: '#EF4444', bg: '#FEE2E2' },
  neutral: { color: '#6B7280', bg: '#F3F4F6' },
}

export const STATUS_SECTION_COLORS = {
  projects:      '#107E68',
  revenue:       '#3B82F6',
  cost:          '#F59E0B',
  profitability: '#10B981',
  risk:          '#EF4444',
  compliance:    '#8B5CF6',
}
