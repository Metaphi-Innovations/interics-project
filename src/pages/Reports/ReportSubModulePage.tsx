import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { ListingTemplate } from '@/components/templates'
import { useToast } from '@/design-system/components'
import { getReportBySlug } from './reportsConfig'
import type { ReportListingRow } from './reportsConfig'
import { ReportListingTable, downloadReportCsv } from './components/ReportListingTable'

export default function ReportSubModulePage() {
  const { reportSlug } = useParams<{ reportSlug: string }>()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')

  const report = reportSlug ? getReportBySlug(reportSlug) : undefined

  const filteredRows = useMemo(() => {
    const rows = report?.rows ?? []
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q)),
    )
  }, [report, search])

  if (!reportSlug) {
    return <Navigate to="/reports/profitability" replace />
  }

  if (!report) {
    return <Navigate to="/reports/profitability" replace />
  }

  const activeReport = report
  const Icon = activeReport.icon

  function handleViewRow(row: ReportListingRow) {
    const label = String(row.project ?? row.vendor ?? row.month ?? row.id)
    showToast({ title: `Viewing report: ${label}`, variant: 'success' })
  }

  function handleExport() {
    downloadReportCsv(activeReport.name, activeReport.columns, filteredRows)
    showToast({ title: 'Export started', variant: 'success' })
  }

  return (
    <ListingTemplate
      icon={<Icon size={20} strokeWidth={1.75} />}
      title={activeReport.name}
      subtitle={activeReport.description}
      searchPlaceholder="Search report…"
      searchValue={search}
      onSearchChange={setSearch}
      showExport
      onExport={handleExport}
      hideToolbar={false}
      clipCardContent={false}
    >
      <ReportListingTable
        reportName={activeReport.name}
        columns={activeReport.columns}
        rows={filteredRows}
        onViewRow={handleViewRow}
      />
    </ListingTemplate>
  )
}
