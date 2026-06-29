import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { ListingTemplate } from '@/components/templates'
import { useToast } from '@/design-system/components'
import { getReportBySlug } from './reportsConfig'
import type { ReportListingRow } from './reportsConfig'
import { ReportListingTable } from './components/ReportListingTable'

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

  const Icon = report.icon

  function handleViewRow(row: ReportListingRow) {
    const label = String(row.project ?? row.vendor ?? row.month ?? row.id)
    showToast({ title: `Viewing report: ${label}`, variant: 'success' })
  }

  function handleExport() {
    showToast({ title: 'Export started (placeholder)', variant: 'success' })
  }

  return (
    <ListingTemplate
      icon={<Icon size={20} strokeWidth={1.75} />}
      title={report.name}
      subtitle={report.description}
      searchPlaceholder="Search report…"
      searchValue={search}
      onSearchChange={setSearch}
      showExport
      onExport={handleExport}
      secondaryActions={[
        {
          label: 'Export',
          onClick: handleExport,
          startIcon: <Download size={16} strokeWidth={2} />,
        },
      ]}
      hideToolbar={false}
      clipCardContent={false}
    >
      <ReportListingTable
        reportName={report.name}
        columns={report.columns}
        rows={filteredRows}
        onViewRow={handleViewRow}
      />
    </ListingTemplate>
  )
}
