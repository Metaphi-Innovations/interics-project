/** Vendor specialization tag colors — light + dark surfaces. */

export interface SpecializationTagColors {
  bg: string
  color: string
}

const OTHER_LIGHT: SpecializationTagColors = { bg: '#F3F4F6', color: '#374151' }
const OTHER_DARK: SpecializationTagColors = { bg: '#374151', color: '#E5E7EB' }

const PAIRS: { test: (s: string) => boolean; light: SpecializationTagColors; dark: SpecializationTagColors }[] =
  [
    {
      test: (x) => /\bcivil\b/.test(x) || /\bstructural\b/.test(x),
      light: { bg: '#FEF3C7', color: '#B45309' },
      dark: { bg: '#78350F', color: '#FCD34D' },
    },
    {
      test: (x) =>
        /\binterior\b/.test(x) ||
        /\bfurniture\b/.test(x) ||
        /ff\s*&\s*e/.test(x) ||
        /\bff&e\b/.test(x),
      light: { bg: '#EDE9FE', color: '#7C3AED' },
      dark: { bg: '#4C1D95', color: '#C4B5FD' },
    },
    {
      test: (x) => /\bmep\b/.test(x) || /\belectrical\b/.test(x),
      light: { bg: '#DBEAFE', color: '#1D4ED8' },
      dark: { bg: '#1E3A8A', color: '#93C5FD' },
    },
    {
      test: (x) => /\blighting\b/.test(x),
      light: { bg: '#FEF3C7', color: '#B45309' },
      dark: { bg: '#78350F', color: '#FCD34D' },
    },
    {
      test: (x) => /\b(flooring|material)\b/.test(x),
      light: { bg: '#DCFCE7', color: '#15803D' },
      dark: { bg: '#14532D', color: '#86EFAC' },
    },
    {
      test: (x) => /\bhvac\b/.test(x),
      light: { bg: '#E0F2FE', color: '#0369A1' },
      dark: { bg: '#0C4A6E', color: '#7DD3FC' },
    },
    {
      test: (x) => /\bcontractor\b/.test(x),
      light: OTHER_LIGHT,
      dark: OTHER_DARK,
    },
  ]

export function getSpecializationTagSx(
  tag: string,
  mode: 'light' | 'dark',
): SpecializationTagColors {
  const x = tag.toLowerCase()
  for (const row of PAIRS) {
    if (row.test(x)) {
      return mode === 'dark' ? row.dark : row.light
    }
  }
  return mode === 'dark' ? OTHER_DARK : OTHER_LIGHT
}
