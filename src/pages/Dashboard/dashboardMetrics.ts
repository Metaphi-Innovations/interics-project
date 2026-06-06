import type { Invoice as ClientInvoice } from '@/slices/receivables/reducer'
import type { Project } from '@/slices/projects/reducer'
import type { Customer } from '@/slices/customers/reducer'
import type { VendorInvoice, Expense } from '@/slices/live/reducer'
import type { Baseline } from '@/slices/baseline/reducer'
import {
  CLIENT_PROJECT_TYPES,
  contractedDesignFee,
  displayProjectStatus,
  mapIndustrySector,
  mapToClientProjectType,
  projectDurationDays,
  classifyVendorServiceCost,
  type BuildCostCategory,
  type ClientProjectType,
} from './dashboardMappings'
import {
  getDateRangeBounds,
  growthPct,
  inCalendarMonth,
  invoiceDocumentDate,
  isoInBounds,
  paidInvoiceCashMonthIso,
} from './dashboardHelpers'
import type {
  DateRange,
  ExecutiveKpis,
  MonthBucket,
  MonthlyFinancialRow,
  NamedValue,
} from './types'

export function sumInvoiceRevenue(invoices: ClientInvoice[]): number {
  return invoices.reduce((s, inv) => s + (inv.baseAmount ?? 0), 0)
}

export function sumCosts(vendor: VendorInvoice[], expenses: Expense[]): number {
  const v = vendor.reduce((s, x) => s + (x.baseAmount ?? 0), 0)
  const e = expenses.reduce((s, x) => s + (x.amount ?? 0), 0)
  return v + e
}

export function sumCollected(invoices: ClientInvoice[]): number {
  return invoices.reduce((s, inv) => {
    if (inv.payments?.length) {
      return s + inv.payments.reduce((ps, p) => ps + (p.netReceived ?? p.amountReceived ?? 0), 0)
    }
    if (inv.status === 'paid') {
      return s + (inv.totalReceived ?? inv.baseAmount ?? 0)
    }
    return s
  }, 0)
}

export function outstandingReceivablesAmount(invoices: ClientInvoice[]): number {
  return invoices.reduce((s, inv) => {
    if (inv.status === 'paid') return s
    const bal = inv.balance ?? (inv.totalAmount ?? 0) - (inv.totalReceived ?? 0)
    return s + Math.max(0, bal > 0 ? bal : inv.baseAmount ?? 0)
  }, 0)
}

export function computeExecutiveKpis(
  projects: Project[],
  prevProjects: Project[],
  invoices: ClientInvoice[],
  prevInvoices: ClientInvoice[],
  vendor: VendorInvoice[],
  expenses: Expense[],
  prevVendor: VendorInvoice[],
  prevExpenses: Expense[],
): ExecutiveKpis {
  const totalRevenue = sumInvoiceRevenue(invoices)
  const totalCost = sumCosts(vendor, expenses)
  const totalProfit = totalRevenue - totalCost
  const prevRevenue = sumInvoiceRevenue(prevInvoices)
  const prevCost = sumCosts(prevVendor, prevExpenses)
  const prevProfit = prevRevenue - prevCost

  const activeProjects = projects.filter((p) => p.status === 'Live').length
  const prevActiveProjects = prevProjects.filter((p) => p.status === 'Live').length

  const activeClientIds = new Set(
    projects.filter((p) => p.status === 'Live').map((p) => p.customerId),
  )
  const prevActiveClientIds = new Set(
    prevProjects.filter((p) => p.status === 'Live').map((p) => p.customerId),
  )

  let feeSum = 0
  let feeArea = 0
  for (const p of projects) {
    const rate = p.designFeePerSqft ?? 0
    const area = p.carpetArea ?? 0
    if (rate > 0 && area > 0) {
      feeSum += rate * area
      feeArea += area
    }
  }
  let prevFeeSum = 0
  let prevFeeArea = 0
  for (const p of prevProjects) {
    const rate = p.designFeePerSqft ?? 0
    const area = p.carpetArea ?? 0
    if (rate > 0 && area > 0) {
      prevFeeSum += rate * area
      prevFeeArea += area
    }
  }

  const avgDesignFeePerSqft = feeArea > 0 ? feeSum / feeArea : 0
  const prevAvgDesignFeePerSqft = prevFeeArea > 0 ? prevFeeSum / prevFeeArea : 0

  const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
  const prevAvgProfitMargin = prevRevenue > 0 ? (prevProfit / prevRevenue) * 100 : 0

  const outstandingReceivables = outstandingReceivablesAmount(invoices)
  const prevOutstandingReceivables = outstandingReceivablesAmount(prevInvoices)

  const customerCounts = new Map<string, number>()
  for (const p of projects) {
    customerCounts.set(p.customerId, (customerCounts.get(p.customerId) ?? 0) + 1)
  }
  const totalCustomers = customerCounts.size
  const repeatCustomers = [...customerCounts.values()].filter((c) => c >= 2).length
  const repeatClientPct = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0

  const prevCustomerCounts = new Map<string, number>()
  for (const p of prevProjects) {
    prevCustomerCounts.set(p.customerId, (prevCustomerCounts.get(p.customerId) ?? 0) + 1)
  }
  const prevTotalCustomers = prevCustomerCounts.size
  const prevRepeatCustomers = [...prevCustomerCounts.values()].filter((c) => c >= 2).length
  const prevRepeatClientPct =
    prevTotalCustomers > 0 ? (prevRepeatCustomers / prevTotalCustomers) * 100 : 0

  return {
    totalRevenue,
    totalProfit,
    activeProjects,
    activeClients: activeClientIds.size,
    avgDesignFeePerSqft,
    avgProfitMargin,
    outstandingReceivables,
    repeatClientPct,
    prevTotalRevenue: prevRevenue,
    prevTotalProfit: prevProfit,
    prevActiveProjects,
    prevActiveClients: prevActiveClientIds.size,
    prevAvgDesignFeePerSqft,
    prevAvgProfitMargin,
    prevOutstandingReceivables,
    prevRepeatClientPct,
  }
}

export function buildMonthlyFinancialSeries(
  buckets: MonthBucket[],
  invoices: ClientInvoice[],
  vendor: VendorInvoice[],
  expenses: Expense[],
): MonthlyFinancialRow[] {
  return buckets.map((b) => {
    const revenue = invoices
      .filter((inv) => inCalendarMonth(invoiceDocumentDate(inv), b.year, b.month))
      .reduce((s, inv) => s + (inv.baseAmount ?? 0), 0)
    const vendorCost = vendor
      .filter((v) => inCalendarMonth(v.invoiceDate, b.year, b.month))
      .reduce((s, v) => s + (v.baseAmount ?? 0), 0)
    const expCost = expenses
      .filter((e) => inCalendarMonth(e.date, b.year, b.month))
      .reduce((s, e) => s + (e.amount ?? 0), 0)
    const cost = vendorCost + expCost
    const profit = revenue - cost
    return {
      month: b.label,
      revenue,
      cost,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    }
  })
}

export function topNByKey(
  rows: { key: string; label: string; value: number }[],
  n: number,
): NamedValue[] {
  return [...rows]
    .sort((a, b) => b.value - a.value)
    .slice(0, n)
    .map((r) => ({ name: r.label, value: r.value }))
}

export function revenueByClient(
  invoices: ClientInvoice[],
  projects: Project[],
): NamedValue[] {
  const projectClient = new Map(projects.map((p) => [p.id, p.customerName]))
  const map = new Map<string, number>()
  for (const inv of invoices) {
    const name = inv.clientName || projectClient.get(inv.projectId) || 'Unknown'
    map.set(name, (map.get(name) ?? 0) + (inv.baseAmount ?? 0))
  }
  return topNByKey(
    [...map.entries()].map(([label, value]) => ({ key: label, label, value })),
    10,
  )
}

export function profitByProject(
  invoices: ClientInvoice[],
  vendor: VendorInvoice[],
  expenses: Expense[],
  projects: Project[],
): NamedValue[] {
  const rev = new Map<string, number>()
  const cost = new Map<string, number>()
  for (const inv of invoices) {
    rev.set(inv.projectId, (rev.get(inv.projectId) ?? 0) + (inv.baseAmount ?? 0))
  }
  for (const v of vendor) {
    cost.set(v.projectId, (cost.get(v.projectId) ?? 0) + (v.baseAmount ?? 0))
  }
  for (const e of expenses) {
    cost.set(e.projectId, (cost.get(e.projectId) ?? 0) + (e.amount ?? 0))
  }
  const rows = projects.map((p) => ({
    key: p.id,
    label: p.name,
    value: (rev.get(p.id) ?? 0) - (cost.get(p.id) ?? 0),
  }))
  return topNByKey(rows, 10)
}

export function profitByClientProjectType(
  invoices: ClientInvoice[],
  vendor: VendorInvoice[],
  expenses: Expense[],
  projects: Project[],
): NamedValue[] {
  const projectMap = new Map(projects.map((p) => [p.id, p]))
  const rev = new Map<ClientProjectType, number>()
  const cost = new Map<ClientProjectType, number>()

  for (const inv of invoices) {
    const p = projectMap.get(inv.projectId)
    if (!p) continue
    const t = mapToClientProjectType(p)
    rev.set(t, (rev.get(t) ?? 0) + (inv.baseAmount ?? 0))
  }
  for (const v of vendor) {
    const p = projectMap.get(v.projectId)
    if (!p) continue
    const t = mapToClientProjectType(p)
    cost.set(t, (cost.get(t) ?? 0) + (v.baseAmount ?? 0))
  }
  for (const e of expenses) {
    const p = projectMap.get(e.projectId)
    if (!p) continue
    const t = mapToClientProjectType(p)
    cost.set(t, (cost.get(t) ?? 0) + (e.amount ?? 0))
  }

  return CLIENT_PROJECT_TYPES.map((name) => ({
    name,
    value: (rev.get(name) ?? 0) - (cost.get(name) ?? 0),
  })).filter((d) => d.value !== 0)
}

export function feeRecoveryMonthly(
  buckets: MonthBucket[],
  projects: Project[],
  invoices: ClientInvoice[],
): { month: string; contracted: number; billed: number; collected: number }[] {
  const contractedTotal = projects.reduce((s, p) => s + contractedDesignFee(p), 0)
  const perMonthContracted =
    buckets.length > 0 ? contractedTotal / buckets.length : 0

  return buckets.map((b) => {
    const billed = invoices
      .filter((inv) => inCalendarMonth(invoiceDocumentDate(inv), b.year, b.month))
      .reduce((s, inv) => s + (inv.baseAmount ?? 0), 0)
    let collected = 0
    for (const inv of invoices) {
      for (const pay of inv.payments ?? []) {
        if (inCalendarMonth(pay.date, b.year, b.month)) {
          collected += pay.netReceived ?? pay.amountReceived ?? 0
        }
      }
      if (!inv.payments?.length && inv.status === 'paid') {
        const iso = paidInvoiceCashMonthIso(inv)
        if (iso && inCalendarMonth(iso, b.year, b.month)) {
          collected += inv.totalReceived ?? inv.baseAmount ?? 0
        }
      }
    }
    return {
      month: b.label,
      contracted: perMonthContracted,
      billed,
      collected,
    }
  })
}

export function billingPerformanceTotals(invoices: ClientInvoice[]): {
  billed: number
  collected: number
  pending: number
} {
  const billed = sumInvoiceRevenue(invoices)
  const collected = sumCollected(invoices)
  return { billed, collected, pending: Math.max(0, billed - collected) }
}

export function billingStackMonthly(
  buckets: MonthBucket[],
  invoices: ClientInvoice[],
): { month: string; billed: number; collected: number; pending: number }[] {
  return buckets.map((b) => {
    const monthInvs = invoices.filter((inv) =>
      inCalendarMonth(invoiceDocumentDate(inv), b.year, b.month),
    )
    const billed = sumInvoiceRevenue(monthInvs)
    const collected = sumCollected(monthInvs)
    return {
      month: b.label,
      billed,
      collected,
      pending: Math.max(0, billed - collected),
    }
  })
}

export function industryDistribution(
  projects: Project[],
  customers: Customer[],
): NamedValue[] {
  const customerSector = new Map(customers.map((c) => [c.id, c.sector]))
  const counts = new Map<string, number>()
  const seen = new Set<string>()
  for (const p of projects) {
    if (seen.has(p.customerId)) continue
    seen.add(p.customerId)
    const sector = p.sector ?? customerSector.get(p.customerId)
    const ind = mapIndustrySector(sector)
    counts.set(ind, (counts.get(ind) ?? 0) + 1)
  }
  const industries = ['Commercial', 'Residential', 'Retail', 'Hospitality', 'Industrial', 'Others']
  return industries.map((name) => ({ name, value: counts.get(name) ?? 0 }))
}

export function clientRetentionMonthly(
  buckets: MonthBucket[],
  projects: Project[],
): { month: string; rate: number }[] {
  const customerFirst = new Map<string, string>()
  for (const p of projects) {
    if (!p.createdAt) continue
    const existing = customerFirst.get(p.customerId)
    if (!existing || p.createdAt < existing) {
      customerFirst.set(p.customerId, p.createdAt)
    }
  }

  return buckets.map((b) => {
    let returning = 0
    let total = 0
    for (const p of projects) {
      if (!inCalendarMonth(p.createdAt, b.year, b.month)) continue
      total++
      const first = customerFirst.get(p.customerId)
      if (first && !inCalendarMonth(first, b.year, b.month)) returning++
    }
    return {
      month: b.label,
      rate: total > 0 ? (returning / total) * 100 : 0,
    }
  })
}

export function projectsPerTeamLead(projects: Project[]): NamedValue[] {
  const map = new Map<string, number>()
  for (const p of projects) {
    const lead = p.projectManager || 'Unassigned'
    map.set(lead, (map.get(lead) ?? 0) + 1)
  }
  return topNByKey(
    [...map.entries()].map(([label, value]) => ({ key: label, label, value })),
    20,
  )
}

export function profitabilityPerTeamLead(
  invoices: ClientInvoice[],
  vendor: VendorInvoice[],
  expenses: Expense[],
  projects: Project[],
): NamedValue[] {
  const leadByProject = new Map(projects.map((p) => [p.id, p.projectManager || 'Unassigned']))
  const rev = new Map<string, number>()
  const cost = new Map<string, number>()
  for (const inv of invoices) {
    const lead = leadByProject.get(inv.projectId) ?? 'Unassigned'
    rev.set(lead, (rev.get(lead) ?? 0) + (inv.baseAmount ?? 0))
  }
  for (const v of vendor) {
    const lead = leadByProject.get(v.projectId) ?? 'Unassigned'
    cost.set(lead, (cost.get(lead) ?? 0) + (v.baseAmount ?? 0))
  }
  for (const e of expenses) {
    const lead = leadByProject.get(e.projectId) ?? 'Unassigned'
    cost.set(lead, (cost.get(lead) ?? 0) + (e.amount ?? 0))
  }
  return topNByKey(
    [...rev.keys()].map((lead) => ({
      key: lead,
      label: lead,
      value: (rev.get(lead) ?? 0) - (cost.get(lead) ?? 0),
    })),
    15,
  )
}

export interface TeamLeadProfitRow {
  lead: string
  profit: number
  marginPct: number
  revenue: number
}

export function profitabilityPerTeamLeadDetailed(
  invoices: ClientInvoice[],
  vendor: VendorInvoice[],
  expenses: Expense[],
  projects: Project[],
): TeamLeadProfitRow[] {
  const leadByProject = new Map(projects.map((p) => [p.id, p.projectManager || 'Unassigned']))
  const rev = new Map<string, number>()
  const cost = new Map<string, number>()
  for (const inv of invoices) {
    const lead = leadByProject.get(inv.projectId) ?? 'Unassigned'
    rev.set(lead, (rev.get(lead) ?? 0) + (inv.baseAmount ?? 0))
  }
  for (const v of vendor) {
    const lead = leadByProject.get(v.projectId) ?? 'Unassigned'
    cost.set(lead, (cost.get(lead) ?? 0) + (v.baseAmount ?? 0))
  }
  for (const e of expenses) {
    const lead = leadByProject.get(e.projectId) ?? 'Unassigned'
    cost.set(lead, (cost.get(lead) ?? 0) + (e.amount ?? 0))
  }
  const leads = new Set([...rev.keys(), ...cost.keys()])
  return [...leads]
    .map((lead) => {
      const revenue = rev.get(lead) ?? 0
      const c = cost.get(lead) ?? 0
      const profit = revenue - c
      const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0
      return { lead, profit, marginPct, revenue }
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 15)
}

export function teamRevenueStacked(
  invoices: ClientInvoice[],
  projects: Project[],
): { lead: string; [type: string]: string | number }[] {
  const projectMap = new Map(projects.map((p) => [p.id, p]))
  const map = new Map<string, Record<string, number>>()
  for (const inv of invoices) {
    const p = projectMap.get(inv.projectId)
    if (!p) continue
    const lead = p.projectManager || 'Unassigned'
    const t = mapToClientProjectType(p)
    if (!map.has(lead)) map.set(lead, {})
    const row = map.get(lead)!
    row[t] = (row[t] ?? 0) + (inv.baseAmount ?? 0)
  }
  return [...map.entries()]
    .map(([lead, types]) => {
      const entry: { lead: string; [type: string]: string | number } = { lead }
      for (const t of CLIENT_PROJECT_TYPES) {
        entry[t] = types[t] ?? 0
      }
      return entry
    })
    .sort((a, b) => {
      const sumA = CLIENT_PROJECT_TYPES.reduce((s, t) => s + Number(a[t] ?? 0), 0)
      const sumB = CLIENT_PROJECT_TYPES.reduce((s, t) => s + Number(b[t] ?? 0), 0)
      return sumB - sumA
    })
    .slice(0, 8)
}

export function projectStatusDonut(projects: Project[]): NamedValue[] {
  const statuses = ['Pitch', 'Live', 'Completed', 'On Hold', 'Cancelled'] as const
  const counts: Record<string, number> = {}
  for (const s of statuses) counts[s] = 0
  for (const p of projects) {
    const label = displayProjectStatus(p.status)
    counts[label] = (counts[label] ?? 0) + 1
  }
  return statuses.map((name) => ({ name, value: counts[name] ?? 0 }))
}

export function projectsByClientType(projects: Project[]): NamedValue[] {
  const counts = new Map<ClientProjectType, number>()
  for (const p of projects) {
    const t = mapToClientProjectType(p)
    counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return CLIENT_PROJECT_TYPES.map((name) => ({
    name,
    value: counts.get(name) ?? 0,
  }))
}

export function durationTrendMonthly(
  buckets: MonthBucket[],
  projects: Project[],
): { month: string; days: number }[] {
  return buckets.map((b) => {
    const completed = projects.filter(
      (p) =>
        p.status === 'Completed' &&
        p.expectedEndDate &&
        inCalendarMonth(p.expectedEndDate, b.year, b.month),
    )
    const durations = completed
      .map(projectDurationDays)
      .filter((d): d is number => d !== null)
    const avg =
      durations.length > 0
        ? durations.reduce((s, d) => s + d, 0) / durations.length
        : 0
    return { month: b.label, days: Math.round(avg) }
  })
}

export function buildCostDonut(
  vendor: VendorInvoice[],
  baselines: Record<string, Baseline | null>,
): NamedValue[] {
  const categories: BuildCostCategory[] = [
    'Civil & Interior',
    'Electrical',
    'HVAC',
    'Plumbing',
    'Fire Fighting',
    'Others',
  ]
  const totals: Record<BuildCostCategory, number> = {
    'Civil & Interior': 0,
    Electrical: 0,
    HVAC: 0,
    Plumbing: 0,
    'Fire Fighting': 0,
    Others: 0,
  }

  for (const v of vendor) {
    const cat = classifyVendorServiceCost(v.serviceName ?? '')
    totals[cat] += v.baseAmount ?? 0
  }

  for (const baseline of Object.values(baselines)) {
    if (!baseline) continue
    for (const cat of baseline.categories) {
      const catName = cat.categoryName.toLowerCase()
      let bucket: BuildCostCategory = 'Others'
      if (catName.includes('civil') || catName.includes('interior') || catName.includes('build')) {
        bucket = 'Civil & Interior'
      } else if (catName.includes('electrical')) bucket = 'Electrical'
      else if (catName.includes('hvac')) bucket = 'HVAC'
      else if (catName.includes('plumb')) bucket = 'Plumbing'
      else if (catName.includes('fire')) bucket = 'Fire Fighting'
      totals[bucket] += cat.totalValue ?? 0
    }
  }

  return categories.map((name) => ({ name, value: totals[name] }))
}

export function buildBenchmarkTrend(
  buckets: MonthBucket[],
  buildProjects: Project[],
): { month: string; costPerSqft: number }[] {
  return buckets.map((b) => {
    const inMonth = buildProjects.filter((p) => inCalendarMonth(p.createdAt, b.year, b.month))
    let sum = 0
    let count = 0
    for (const p of inMonth) {
      const rate = p.buildValuePerSqft ?? 0
      if (rate > 0) {
        sum += rate
        count++
      }
    }
    return { month: b.label, costPerSqft: count > 0 ? sum / count : 0 }
  })
}

export function receivablesTrend(
  buckets: MonthBucket[],
  invoices: ClientInvoice[],
): { month: string; outstanding: number }[] {
  return buckets.map((b) => {
    const outstanding = invoices
      .filter(
        (inv) =>
          inv.status !== 'paid' &&
          inCalendarMonth(invoiceDocumentDate(inv), b.year, b.month),
      )
      .reduce((s, inv) => s + (inv.balance ?? inv.baseAmount ?? 0), 0)
    return { month: b.label, outstanding }
  })
}

export function collectionsTrend(
  buckets: MonthBucket[],
  invoices: ClientInvoice[],
): { month: string; collected: number }[] {
  return buckets.map((b) => {
    let collected = 0
    for (const inv of invoices) {
      for (const pay of inv.payments ?? []) {
        if (inCalendarMonth(pay.date, b.year, b.month)) {
          collected += pay.netReceived ?? pay.amountReceived ?? 0
        }
      }
    }
    return { month: b.label, collected }
  })
}

export function revenueThisCalendarYear(invoices: ClientInvoice[]): number {
  const now = new Date()
  const y = now.getFullYear()
  return invoices
    .filter((inv) => {
      const d = new Date(invoiceDocumentDate(inv))
      return d.getFullYear() === y
    })
    .reduce((s, inv) => s + (inv.baseAmount ?? 0), 0)
}

export function filterFinancialByDate<T extends { projectId: string }>(
  items: T[],
  projectIds: Set<string> | null,
  getDate: (item: T) => string,
  range: DateRange,
): T[] {
  let scoped = items
  if (projectIds !== null) {
    if (projectIds.size === 0) return []
    scoped = scoped.filter((x) => projectIds.has(x.projectId))
  }
  if (range === 'All Time') return scoped
  const bounds = getDateRangeBounds(range)
  return scoped.filter((x) => isoInBounds(getDate(x), bounds))
}

export function filterFinancialByBounds<T extends { projectId: string }>(
  items: T[],
  projectIds: Set<string> | null,
  getDate: (item: T) => string,
  bounds: import('./types').DateRangeBounds,
): T[] {
  let scoped = items
  if (projectIds !== null) {
    if (projectIds.size === 0) return []
    scoped = scoped.filter((x) => projectIds.has(x.projectId))
  }
  return scoped.filter((x) => isoInBounds(getDate(x), bounds))
}

export function avgBuildRatePerSqft(
  projects: Project[],
  pick: (p: Project) => number | null | undefined,
): number {
  let sum = 0
  let n = 0
  for (const p of projects) {
    const v = pick(p) ?? 0
    if (v > 0) {
      sum += v
      n++
    }
  }
  return n > 0 ? sum / n : 0
}

export function pitchConversionRate(projects: Project[]): number {
  const pitches = projects.filter((p) => p.status === 'Pitch').length
  const won = projects.filter((p) => p.status === 'Live' || p.status === 'Completed').length
  const denom = pitches + won
  return denom > 0 ? (won / denom) * 100 : 0
}

export function profitabilityPerLeadSingle(
  invoices: ClientInvoice[],
  vendor: VendorInvoice[],
  expenses: Expense[],
  projects: Project[],
): number {
  const leads = profitabilityPerTeamLead(invoices, vendor, expenses, projects)
  if (leads.length === 0) return 0
  return leads.reduce((s, l) => s + l.value, 0) / leads.length
}

export function projectsStartedInRange(projects: Project[], range: DateRange): number {
  if (range === 'All Time') return projects.filter((p) => p.startDate).length
  const bounds = getDateRangeBounds(range)
  return projects.filter((p) => p.startDate && isoInBounds(p.startDate, bounds)).length
}

export function projectsCompletedInRange(projects: Project[], range: DateRange): number {
  const completed = projects.filter((p) => p.status === 'Completed')
  if (range === 'All Time') return completed.length
  const bounds = getDateRangeBounds(range)
  return completed.filter(
    (p) => p.expectedEndDate && isoInBounds(p.expectedEndDate, bounds),
  ).length
}

export function averageProjectDuration(projects: Project[]): number {
  const durations = projects
    .filter((p) => p.status === 'Completed')
    .map(projectDurationDays)
    .filter((d): d is number => d !== null)
  if (durations.length === 0) return 0
  return Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
}

export { growthPct }
