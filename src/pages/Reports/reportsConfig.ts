import type { LucideIcon } from 'lucide-react'
import {
  TrendingUp,
  ArrowLeftRight,
  Receipt,
  CreditCard,
  Building2,
} from 'lucide-react'

export type ReportColumnFormat = 'text' | 'currency' | 'percent' | 'status'

export interface ReportColumn {
  key: string
  label: string
  align?: 'left' | 'right'
  format?: ReportColumnFormat
}

export interface ReportListingRow {
  id: string
  [key: string]: string | number
}

export interface ReportTypeDefinition {
  id: string
  slug: string
  name: string
  description: string
  path: string
  icon: LucideIcon
  columns: ReportColumn[]
  rows: ReportListingRow[]
}

export const REPORT_TYPES: ReportTypeDefinition[] = [
  {
    id: 'profitability',
    slug: 'profitability',
    name: 'Profitability Reports',
    description: 'Project-level margin and profitability summary',
    path: '/reports/profitability',
    icon: TrendingUp,
    columns: [
      { key: 'project', label: 'Project' },
      { key: 'clientValue', label: 'Client Value', align: 'right', format: 'currency' },
      { key: 'vendorCost', label: 'Vendor Cost', align: 'right', format: 'currency' },
      { key: 'expenses', label: 'Expenses', align: 'right', format: 'currency' },
      { key: 'profit', label: 'Profit', align: 'right', format: 'currency' },
      { key: 'profitPct', label: 'Profit %', align: 'right', format: 'percent' },
    ],
    rows: [
      {
        id: 'pr-1',
        project: 'Acme Corp - Head Office Redesign',
        clientValue: 3_500_000,
        vendorCost: 2_250_000,
        expenses: 113_000,
        profit: 1_137_000,
        profitPct: 32.5,
      },
      {
        id: 'pr-2',
        project: 'TechVentures - Office Expansion',
        clientValue: 2_800_000,
        vendorCost: 1_800_000,
        expenses: 20_000,
        profit: 980_000,
        profitPct: 35,
      },
      {
        id: 'pr-3',
        project: 'Global Solutions - Store Renovation',
        clientValue: 1_850_000,
        vendorCost: 1_200_000,
        expenses: 0,
        profit: 650_000,
        profitPct: 35.1,
      },
    ],
  },
  {
    id: 'cash-flow',
    slug: 'cash-flow',
    name: 'Cash Flow Reports',
    description: 'Monthly cash position and movement',
    path: '/reports/cash-flow',
    icon: ArrowLeftRight,
    columns: [
      { key: 'month', label: 'Month' },
      { key: 'openingBalance', label: 'Opening Balance', align: 'right', format: 'currency' },
      { key: 'receivables', label: 'Receivables', align: 'right', format: 'currency' },
      { key: 'payables', label: 'Payables', align: 'right', format: 'currency' },
      { key: 'expenses', label: 'Expenses', align: 'right', format: 'currency' },
      { key: 'closingBalance', label: 'Closing Balance', align: 'right', format: 'currency' },
    ],
    rows: [
      {
        id: 'cf-1',
        month: 'Jan 2026',
        openingBalance: 4_200_000,
        receivables: 1_550_000,
        payables: 1_200_000,
        expenses: 113_000,
        closingBalance: 4_437_000,
      },
      {
        id: 'cf-2',
        month: 'Feb 2026',
        openingBalance: 4_437_000,
        receivables: 980_000,
        payables: 750_000,
        expenses: 20_000,
        closingBalance: 4_647_000,
      },
      {
        id: 'cf-3',
        month: 'Mar 2026',
        openingBalance: 4_647_000,
        receivables: 740_000,
        payables: 580_000,
        expenses: 18_500,
        closingBalance: 4_788_500,
      },
    ],
  },
  {
    id: 'receivables',
    slug: 'receivables',
    name: 'Receivables Reports',
    description: 'Client billing and collection status by project',
    path: '/reports/receivables',
    icon: Receipt,
    columns: [
      { key: 'project', label: 'Project' },
      { key: 'client', label: 'Client' },
      { key: 'poValue', label: 'PO Value', align: 'right', format: 'currency' },
      { key: 'invoiced', label: 'Invoiced', align: 'right', format: 'currency' },
      { key: 'received', label: 'Received', align: 'right', format: 'currency' },
      { key: 'outstanding', label: 'Outstanding', align: 'right', format: 'currency' },
      { key: 'status', label: 'Status', format: 'status' },
    ],
    rows: [
      {
        id: 'rec-1',
        project: 'Acme Corp - Head Office Redesign',
        client: 'Acme Corp',
        poValue: 3_500_000,
        invoiced: 1_550_000,
        received: 0,
        outstanding: 1_550_000,
        status: 'partial',
      },
      {
        id: 'rec-2',
        project: 'TechVentures - Office Expansion',
        client: 'TechVentures Ltd',
        poValue: 2_800_000,
        invoiced: 980_000,
        received: 0,
        outstanding: 980_000,
        status: 'overdue',
      },
      {
        id: 'rec-3',
        project: 'Global Solutions - Store Renovation',
        client: 'Global Solutions LLP',
        poValue: 1_850_000,
        invoiced: 740_000,
        received: 740_000,
        outstanding: 0,
        status: 'paid',
      },
    ],
  },
  {
    id: 'payables',
    slug: 'payables',
    name: 'Payables Reports',
    description: 'Vendor PO and payment status by project',
    path: '/reports/payables',
    icon: CreditCard,
    columns: [
      { key: 'project', label: 'Project' },
      { key: 'vendor', label: 'Vendor' },
      { key: 'poValue', label: 'PO Value', align: 'right', format: 'currency' },
      { key: 'invoiced', label: 'Invoiced', align: 'right', format: 'currency' },
      { key: 'paid', label: 'Paid', align: 'right', format: 'currency' },
      { key: 'outstanding', label: 'Outstanding', align: 'right', format: 'currency' },
      { key: 'status', label: 'Status', format: 'status' },
    ],
    rows: [
      {
        id: 'pay-1',
        project: 'Acme Corp - Head Office Redesign',
        vendor: 'BuildWell Constructions',
        poValue: 2_250_000,
        invoiced: 1_400_000,
        paid: 1_200_000,
        outstanding: 200_000,
        status: 'partial',
      },
      {
        id: 'pay-2',
        project: 'TechVentures - Office Expansion',
        vendor: 'FloorMaster Pvt Ltd',
        poValue: 1_100_000,
        invoiced: 880_000,
        paid: 750_000,
        outstanding: 130_000,
        status: 'pending',
      },
      {
        id: 'pay-3',
        project: 'Global Solutions - Store Renovation',
        vendor: 'BuildWell Constructions',
        poValue: 1_200_000,
        invoiced: 580_000,
        paid: 580_000,
        outstanding: 0,
        status: 'paid',
      },
    ],
  },
  {
    id: 'vendor-analysis',
    slug: 'vendor-analysis',
    name: 'Vendor Analysis',
    description: 'Vendor spend and performance across projects',
    path: '/reports/vendor-analysis',
    icon: Building2,
    columns: [
      { key: 'vendor', label: 'Vendor' },
      { key: 'projects', label: 'Projects', align: 'right' },
      { key: 'poValue', label: 'PO Value', align: 'right', format: 'currency' },
      { key: 'paidAmount', label: 'Paid Amount', align: 'right', format: 'currency' },
      { key: 'outstanding', label: 'Outstanding', align: 'right', format: 'currency' },
      { key: 'performance', label: 'Performance', format: 'status' },
    ],
    rows: [
      {
        id: 'va-1',
        vendor: 'BuildWell Constructions',
        projects: 3,
        poValue: 4_850_000,
        paidAmount: 3_920_000,
        outstanding: 930_000,
        performance: 'good',
      },
      {
        id: 'va-2',
        vendor: 'FloorMaster Pvt Ltd',
        projects: 2,
        poValue: 2_400_000,
        paidAmount: 1_850_000,
        outstanding: 550_000,
        performance: 'average',
      },
      {
        id: 'va-3',
        vendor: 'Spectrum Interiors',
        projects: 1,
        poValue: 1_200_000,
        paidAmount: 1_200_000,
        outstanding: 0,
        performance: 'excellent',
      },
    ],
  },
]

export function getReportBySlug(slug: string): ReportTypeDefinition | undefined {
  return REPORT_TYPES.find((report) => report.slug === slug)
}
