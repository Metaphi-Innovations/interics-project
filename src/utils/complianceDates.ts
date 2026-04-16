import dayjs from 'dayjs'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const SHORT_MONTH: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
}

/** Build period selector options: last 12 months + two FY quarters */
export function buildCompliancePeriodOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = []
  for (let i = 0; i < 12; i++) {
    const d = dayjs().subtract(i, 'month')
    const value = d.format('YYYY-MM')
    const label = `${MONTH_NAMES[d.month()]} ${d.year()}`
    out.push({ value, label })
  }
  out.push({ value: 'FY2026-Q4', label: 'Q4 FY2026' })
  out.push({ value: 'FY2026-Q3', label: 'Q3 FY2026' })
  return out
}

/** Map filing row display period to Redux / API period key */
export function filingDisplayPeriodToSelectorValue(period: string): string {
  const q4 = period.match(/^Q4 FY(\d{4})$/)
  if (q4) return `FY${q4[1]}-Q4`
  const q3 = period.match(/^Q3 FY(\d{4})$/)
  if (q3) return `FY${q3[1]}-Q3`
  const m = period.match(/^([A-Za-z]{3}) (\d{4})$/)
  if (m) {
    const mon = SHORT_MONTH[m[1] as keyof typeof SHORT_MONTH]
    if (mon !== undefined) {
      return dayjs()
        .year(Number(m[2]))
        .month(mon)
        .date(1)
        .format('YYYY-MM')
    }
  }
  return period
}

function parseIso(d: string): dayjs.Dayjs {
  return dayjs(d, 'YYYY-MM-DD', true)
}

/** Delay column: '+N days late' or '—' */
export function formatFilingDelay(
  dueDate: string,
  filedDate: string | null,
  status: string,
): { text: string; isLate: boolean } {
  const due = parseIso(dueDate)
  if (!due.isValid()) return { text: '—', isLate: false }

  const end = filedDate ? parseIso(filedDate) : dayjs()
  if (!end.isValid()) return { text: '—', isLate: false }

  if (filedDate) {
    const days = end.diff(due, 'day')
    if (days <= 0) return { text: '—', isLate: false }
    return { text: `+${days} day${days === 1 ? '' : 's'} late`, isLate: true }
  }

  if (status === 'filed') return { text: '—', isLate: false }

  const daysLate = dayjs().diff(due, 'day')
  if (daysLate <= 0) return { text: '—', isLate: false }
  return { text: `+${daysLate} day${daysLate === 1 ? '' : 's'} late`, isLate: true }
}

export function formatDisplayDate(iso: string): string {
  const d = parseIso(iso)
  return d.isValid() ? d.format('DD MMM YYYY') : iso
}
