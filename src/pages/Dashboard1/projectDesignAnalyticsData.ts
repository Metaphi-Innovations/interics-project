/**
 * Sample data for Dashboard 1 — Project Design Analytics (per-project view).
 */

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

function feePerSqft(
  design: number,
  approvals: number,
  acoustic: number,
  lighting: number,
  pmc: number,
  interior: number,
): DesignFeePerSqftRow[] {
  return [
    { service: 'Design', feePerSqft: design },
    { service: 'Approvals', feePerSqft: approvals },
    { service: 'Acoustic', feePerSqft: acoustic },
    { service: 'Lighting Consultancy', feePerSqft: lighting },
    { service: 'PMC', feePerSqft: pmc },
    { service: 'Interior Consultancy', feePerSqft: interior },
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
    feePerSqft: feePerSqft(185, 42, 28, 35, 55, 95),
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
    feePerSqft: feePerSqft(210, 48, 32, 40, 62, 110),
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
    feePerSqft: feePerSqft(160, 38, 22, 30, 48, 82),
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
    feePerSqft: feePerSqft(195, 45, 30, 38, 58, 102),
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
    feePerSqft: feePerSqft(172, 40, 25, 33, 50, 88),
    duration: duration(140, 149),
  },
}
