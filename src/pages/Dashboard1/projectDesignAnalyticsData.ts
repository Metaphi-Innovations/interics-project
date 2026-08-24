/**
 * Sample data for Dashboard 1 — Project Design Analytics (per-project view).
 */

import { CHART_COLORS } from '@/design-system/tokens'

export type DesignProjectId =
  | 'abc-head-office'
  | 'xyz-corporate'
  | 'tcs-pune'
  | 'infosys-bangalore'
  | 'wipro-hyderabad'

export interface DesignProjectOption {
  id: DesignProjectId
  label: string
}

export const DESIGN_PROJECT_OPTIONS: DesignProjectOption[] = [
  { id: 'abc-head-office', label: 'ABC Head Office' },
  { id: 'xyz-corporate', label: 'XYZ Corporate Office' },
  { id: 'tcs-pune', label: 'TCS Pune Office' },
  { id: 'infosys-bangalore', label: 'Infosys Bangalore' },
  { id: 'wipro-hyderabad', label: 'Wipro Hyderabad' },
]

export const DEFAULT_DESIGN_PROJECT_ID: DesignProjectId = 'abc-head-office'

export type DesignFinancialIcon = 'value' | 'payable' | 'profit' | 'fee'

export interface DesignProjectDetails {
  projectName: string
  carpetArea: string
  headcount: string
  building: string
  clientSector: string
  projectManager: string
}

export interface DesignFinancialKpi {
  id: string
  title: string
  value: string
  subtitle: string
  icon: DesignFinancialIcon
}

/** One fee category for the Fee per Sq.ft chart (data-driven; extras appear automatically). */
export interface DesignFeePerSqftRow {
  service: string
  feePerSqft: number
}

export interface DesignDurationRow {
  label: string
  days: number
}

export interface DesignProjectAnalytics {
  details: DesignProjectDetails
  financialSummary: DesignFinancialKpi[]
  feePerSqft: DesignFeePerSqftRow[]
  duration: DesignDurationRow[]
}

function financialSummary(
  totalValue: string,
  vendorsPayable: string,
  profitPct: string,
  designFee: string,
): DesignFinancialKpi[] {
  return [
    {
      id: 'total-value',
      title: 'Total Project Value',
      value: totalValue,
      subtitle: 'Agreed contract value for this project.',
      icon: 'value',
    },
    {
      id: 'vendors-payable',
      title: 'Vendors Payable',
      value: vendorsPayable,
      subtitle: 'Outstanding amount due to vendors.',
      icon: 'payable',
    },
    {
      id: 'profit-pct',
      title: 'Profit Percentage',
      value: profitPct,
      subtitle: 'Estimated profit margin on design scope.',
      icon: 'profit',
    },
    {
      id: 'total-design-fee',
      title: 'Total Design Fee',
      value: designFee,
      subtitle: 'Sum of design-related fees for this project.',
      icon: 'fee',
    },
  ]
}

/** Default fee categories shown for every project (additional rows may be appended). */
export const DEFAULT_FEE_CATEGORIES = ['Design', 'Build', 'Consultancy'] as const

const FEE_CATEGORY_COLORS: Record<string, string> = {
  Design: CHART_COLORS.teal,
  Build: CHART_COLORS.amber,
  Consultancy: CHART_COLORS.blue,
}

const EXTRA_FEE_CATEGORY_COLORS = [
  CHART_COLORS.purple,
  CHART_COLORS.green,
  CHART_COLORS.orange,
  CHART_COLORS.red,
  CHART_COLORS.grey,
]

export function feeCategoryColor(category: string, index: number): string {
  return (
    FEE_CATEGORY_COLORS[category] ??
    EXTRA_FEE_CATEGORY_COLORS[index % EXTRA_FEE_CATEGORY_COLORS.length]!
  )
}

/**
 * Core fee categories plus any future extras.
 * Additional categories passed in `extras` appear automatically on the chart.
 */
function feePerSqft(
  design: number,
  build: number,
  consultancy: number,
  extras: DesignFeePerSqftRow[] = [],
): DesignFeePerSqftRow[] {
  return [
    { service: 'Design', feePerSqft: design },
    { service: 'Build', feePerSqft: build },
    { service: 'Consultancy', feePerSqft: consultancy },
    ...extras,
  ]
}

function duration(planned: number, actual: number): DesignDurationRow[] {
  return [
    { label: 'Planned Duration', days: planned },
    { label: 'Actual Duration', days: actual },
  ]
}

export const DESIGN_PROJECT_ANALYTICS: Record<DesignProjectId, DesignProjectAnalytics> = {
  'abc-head-office': {
    details: {
      projectName: 'ABC Head Office',
      carpetArea: '4,850 sqft',
      headcount: '120',
      building: 'Connaught Place Tower, Delhi',
      clientSector: 'Corporate',
      projectManager: 'Arjun Nair',
    },
    financialSummary: financialSummary('₹2.85 Cr', '₹48.2 L', '18.4%', '₹21.4 L'),
    feePerSqft: feePerSqft(185, 420, 255),
    duration: duration(120, 138),
  },
  'xyz-corporate': {
    details: {
      projectName: 'XYZ Corporate Office',
      carpetArea: '7,200 sqft',
      headcount: '210',
      building: 'BKC Platinum, Mumbai',
      clientSector: 'BFSI',
      projectManager: 'Meera Shah',
    },
    financialSummary: financialSummary('₹4.10 Cr', '₹72.5 L', '21.2%', '₹34.8 L'),
    feePerSqft: feePerSqft(210, 480, 292),
    duration: duration(150, 162),
  },
  'tcs-pune': {
    details: {
      projectName: 'TCS Pune Office',
      carpetArea: '12,400 sqft',
      headcount: '480',
      building: 'Hinjewadi Phase 2, Pune',
      clientSector: 'IT / Technology',
      projectManager: 'Rohan Deshmukh',
    },
    financialSummary: financialSummary('₹6.75 Cr', '₹1.15 Cr', '16.8%', '₹52.0 L'),
    feePerSqft: feePerSqft(160, 390, 220),
    duration: duration(180, 195),
  },
  'infosys-bangalore': {
    details: {
      projectName: 'Infosys Bangalore',
      carpetArea: '9,600 sqft',
      headcount: '350',
      building: 'Electronic City Campus, Bengaluru',
      clientSector: 'IT / Technology',
      projectManager: 'Priya Menon',
    },
    financialSummary: financialSummary('₹5.40 Cr', '₹89.0 L', '19.6%', '₹41.2 L'),
    feePerSqft: feePerSqft(195, 450, 273),
    duration: duration(165, 158),
  },
  'wipro-hyderabad': {
    details: {
      projectName: 'Wipro Hyderabad',
      carpetArea: '8,150 sqft',
      headcount: '275',
      building: 'Gachibowli Tech Park, Hyderabad',
      clientSector: 'IT / Technology',
      projectManager: 'Karthik Reddy',
    },
    financialSummary: financialSummary('₹3.95 Cr', '₹61.4 L', '17.1%', '₹29.6 L'),
    feePerSqft: feePerSqft(172, 410, 236),
    duration: duration(140, 149),
  },
}

export interface FeePerSqftChartRow {
  category: string
  feePerSqft: number
  color: string
}

/** Chart rows from whatever fee categories exist on the project (data-driven). */
export function buildFeePerSqftChartData(
  rows: readonly DesignFeePerSqftRow[],
): FeePerSqftChartRow[] {
  return rows
    .filter((r) => r.service.trim().length > 0 && r.feePerSqft > 0)
    .map((r, index) => ({
      category: r.service,
      feePerSqft: r.feePerSqft,
      color: feeCategoryColor(r.service, index),
    }))
}
