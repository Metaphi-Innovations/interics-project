/**
 * Sample data for Dashboard 1 — Larger Meta Data section.
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

export interface ProjectHighlight {
  id: string
  title: string
  projectName: string
  detailLabel: string
  detailValue: string
  icon: 'largest' | 'smallest' | 'fastest' | 'slowest'
}

export const PROJECT_HIGHLIGHTS: ProjectHighlight[] = [
  {
    id: 'largest',
    title: 'Largest Project',
    projectName: 'Horizon Corporate Campus',
    detailLabel: 'Area / Size',
    detailValue: '48,500 sqft',
    icon: 'largest',
  },
  {
    id: 'smallest',
    title: 'Smallest Project',
    projectName: 'Studio Nest Boutique',
    detailLabel: 'Area / Size',
    detailValue: '820 sqft',
    icon: 'smallest',
  },
  {
    id: 'fastest',
    title: 'Fastest Project Delivered',
    projectName: 'Pulse Clinic Fit-out',
    detailLabel: 'Delivery Duration',
    detailValue: '46 days',
    icon: 'fastest',
  },
  {
    id: 'slowest',
    title: 'Slowest Project Delivered',
    projectName: 'Grand Oak Hospitality',
    detailLabel: 'Delivery Duration',
    detailValue: '312 days',
    icon: 'slowest',
  },
]
