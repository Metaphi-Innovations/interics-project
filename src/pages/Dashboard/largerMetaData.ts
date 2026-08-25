/**
 * Sample data for Dashboard — Larger Meta Data section.
 */

export interface MetaKpi {
  id: string
  title: string
  value: string
  subtitle: string
  icon: 'projects' | 'area' | 'revenue' | 'fee'
}

export const LARGER_META_KPIS: MetaKpi[] = [
  {
    id: 'projects',
    title: 'Total Projects Completed',
    value: '142',
    subtitle: 'All-time completed projects across the portfolio.',
    icon: 'projects',
  },
  {
    id: 'area',
    title: 'Total Area Designed (Lifetime)',
    value: '6.8 Lakh sqft',
    subtitle: 'Cumulative carpet area designed to date.',
    icon: 'area',
  },
  {
    id: 'revenue',
    title: 'Total Revenue',
    value: '₹48.2 Cr',
    subtitle: 'Lifetime revenue across all projects.',
    icon: 'revenue',
  },
  {
    id: 'fee',
    title: 'Average Fee / Sq.ft',
    value: '₹710',
    subtitle: 'Mean design fee realised per square foot.',
    icon: 'fee',
  },
]
