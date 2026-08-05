/**
 * Sample data for Dashboard 1 — Vendors section.
 */

export interface VendorKpi {
  id: string
  title: string
  value: string
  subtitle: string
  icon: 'billing' | 'projects'
}

export const VENDOR_SUMMARY_KPIS: VendorKpi[] = [
  {
    id: 'billing',
    title: 'Total Vendor Billing (Current Year)',
    value: '₹1.86 Cr',
    subtitle: 'Total vendor billing for the selected financial year.',
    icon: 'billing',
  },
  {
    id: 'projects',
    title: 'Projects Completed Together',
    value: '27',
    subtitle: 'Projects completed in partnership with vendors.',
    icon: 'projects',
  },
]

/** Current-year vendor billing — sorted highest → lowest. */
export const VENDOR_BILLING_CURRENT_YEAR = [
  { vendor: 'BuildWell Constructions', billing: 6_200_000 },
  { vendor: 'ElectroTech Solutions', billing: 4_150_000 },
  { vendor: 'Craft Studio Design', billing: 3_400_000 },
  { vendor: 'AquaFlow MEP', billing: 2_850_000 },
  { vendor: 'Nova Acoustics', billing: 2_000_000 },
]

/** Multi-year vendor billing trends (₹). */
export const VENDOR_BILLING_ACROSS_YEARS = [
  {
    year: '2022',
    buildwell: 3_800_000,
    electrotech: 2_400_000,
    craft: 1_900_000,
    aquaflow: 1_500_000,
    nova: 1_100_000,
  },
  {
    year: '2023',
    buildwell: 4_600_000,
    electrotech: 3_100_000,
    craft: 2_500_000,
    aquaflow: 2_000_000,
    nova: 1_450_000,
  },
  {
    year: '2024',
    buildwell: 5_400_000,
    electrotech: 3_700_000,
    craft: 2_950_000,
    aquaflow: 2_400_000,
    nova: 1_750_000,
  },
  {
    year: '2025',
    buildwell: 6_200_000,
    electrotech: 4_150_000,
    craft: 3_400_000,
    aquaflow: 2_850_000,
    nova: 2_000_000,
  },
]

export const VENDOR_BILLING_YEAR_LINES = [
  { key: 'buildwell', label: 'BuildWell Constructions' },
  { key: 'electrotech', label: 'ElectroTech Solutions' },
  { key: 'craft', label: 'Craft Studio Design' },
  { key: 'aquaflow', label: 'AquaFlow MEP' },
  { key: 'nova', label: 'Nova Acoustics' },
] as const

/** Projects completed with each vendor — sorted highest → lowest. */
export const PROJECTS_COMPLETED_TOGETHER = [
  { vendor: 'BuildWell Constructions', projects: 8 },
  { vendor: 'ElectroTech Solutions', projects: 6 },
  { vendor: 'Craft Studio Design', projects: 5 },
  { vendor: 'AquaFlow MEP', projects: 4 },
  { vendor: 'Nova Acoustics', projects: 4 },
]
