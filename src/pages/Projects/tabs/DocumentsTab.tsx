/**
 * Project detail Documents tab — grouped by Project, Client, and Vendor document sets.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { FileUp, Trash2 } from 'lucide-react'
import { DrawerForm, FormField } from '../../../components/templates/DrawerForm'
import {
  Badge,
  Button,
  FileUpload,
  IconButton,
  Input,
  Select,
  Textarea,
} from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { fetchInvoices, fetchVendorInvoices } from '../../../slices/live/thunk'
import type { ClientInvoice, VendorInvoice } from '../../../slices/live/types'
import type { Project } from '../../../slices/projects/reducer'
import { formatDate, toSlug } from '../../../utils/formatters'
import {
  TABLE_CELL_SX,
  TABLE_HEADER_SX,
} from './live/vendorSettlement/utils'
import {
  isLegacyInternalUploadCategory,
  useProjectDocumentUploads,
  type UploadCategory,
  type UploadedProjectDocument,
} from '../projectDocumentUploads'
import {
  buildProjectDocumentSections,
  countProjectDocumentRows,
  filterProjectDocumentSectionsBySearch,
  mergeLegacyInternalUploadRows,
  resolveProjectForDocuments,
  type ProjectDocumentColumnRow,
} from '../projectDocumentsDisplay'

// ─── Types ───────────────────────────────────────────────────────────────────

type DocumentFilter = 'all' | 'client' | 'vendor' | 'project'

const ACCEPT =
  '.pdf,.doc,.docx,.xlsx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png'

/** Fixed column widths — must sum to 100% for consistent alignment across all document tables. */
const DOCUMENTS_COL_WIDTH = {
  name: '28%',
  type: '14%',
  uploadedBy: '16%',
  date: '14%',
  size: '12%',
  action: '16%',
} as const

const DOCUMENTS_HEADER_SX = {
  ...TABLE_HEADER_SX,
  px: 2,
  py: 1.5,
  verticalAlign: 'middle',
} as const

const DOCUMENTS_CELL_SX = {
  ...TABLE_CELL_SX,
  px: 2,
  py: 1.5,
  verticalAlign: 'middle',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const

const CATEGORY_OPTIONS: { value: UploadCategory; label: string }[] = [
  { value: 'client_quotation', label: 'Client Quotation' },
  { value: 'client_po', label: 'Client PO' },
  { value: 'vendor_quotation', label: 'Vendor Quotation' },
  { value: 'vendor_po', label: 'Vendor PO' },
  { value: 'vendor_invoice_doc', label: 'Vendor Invoice (upload)' },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function typeLabelForUpload(cat: UploadCategory): string {
  const map: Record<UploadCategory, string> = {
    client_quotation: 'Client Quotation',
    client_po: 'Client PO',
    vendor_quotation: 'Vendor Quotation',
    vendor_po: 'Vendor PO',
    vendor_invoice_doc: 'Vendor Invoice',
    internal_requirements: 'Requirements',
    internal_attachments: 'Attachment',
    other: 'Other',
  }
  return map[cat]
}

function matchesSearch(text: string, q: string): boolean {
  if (!q.trim()) return true
  return text.toLowerCase().includes(q.trim().toLowerCase())
}

// ─── Subsection tables ───────────────────────────────────────────────────────

type ColumnRow = ProjectDocumentColumnRow

function RowActions({
  row,
  onDelete,
}: {
  row: ColumnRow
  onDelete?: (id: string) => void
}) {
  const deleteEnabled = Boolean(row.canDelete && onDelete)

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="flex-end"
      gap={0.5}
      sx={{ width: '100%', minWidth: 0 }}
    >
      <Button variant="soft" color="primary" size="sm" onClick={row.onView}>
        View
      </Button>
      <IconButton
        size="sm"
        variant="outlined"
        color="default"
        icon={<Trash2 size={14} strokeWidth={1.75} />}
        tooltip="Delete document"
        disabled={!deleteEnabled}
        onClick={() => {
          if (deleteEnabled && onDelete) onDelete(row.id)
        }}
      />
    </Stack>
  )
}

const DOCUMENTS_TABLE_COLUMNS: { key: keyof typeof DOCUMENTS_COL_WIDTH; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'uploadedBy', label: 'Uploaded by' },
  { key: 'date', label: 'Date' },
  { key: 'size', label: 'Size' },
  { key: 'action', label: 'Action' },
]

function DocumentsTable({
  rows,
  onDelete,
}: {
  rows: ColumnRow[]
  onDelete?: (id: string) => void
}) {
  return (
    <Table
      size="small"
      sx={{
        tableLayout: 'fixed',
        width: '100%',
        '& .MuiTableCell-root': { boxSizing: 'border-box' },
      }}
    >
      <TableHead>
        <TableRow>
          {DOCUMENTS_TABLE_COLUMNS.map(({ key, label }) => (
            <TableCell
              key={key}
              sx={{
                ...DOCUMENTS_HEADER_SX,
                width: DOCUMENTS_COL_WIDTH[key],
                textAlign: key === 'action' ? 'right' : 'left',
              }}
            >
              {label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} sx={{ ...DOCUMENTS_CELL_SX, color: 'text.secondary' }}>
              No documents in this category.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell
                sx={{
                  ...DOCUMENTS_CELL_SX,
                  width: DOCUMENTS_COL_WIDTH.name,
                  fontWeight: 500,
                }}
              >
                {row.href ? (
                  <Typography
                    component="a"
                    href={row.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: 'primary.main',
                      textDecoration: 'none',
                      wordBreak: 'break-word',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {row.name}
                  </Typography>
                ) : (
                  <Typography variant="body2" component="span" sx={{ wordBreak: 'break-word' }}>
                    {row.name}
                  </Typography>
                )}
              </TableCell>
              <TableCell sx={{ ...DOCUMENTS_CELL_SX, width: DOCUMENTS_COL_WIDTH.type }}>
                <Badge label={row.typeLabel} color="neutral" size="sm" variant="outlined" />
              </TableCell>
              <TableCell sx={{ ...DOCUMENTS_CELL_SX, width: DOCUMENTS_COL_WIDTH.uploadedBy }}>
                {row.uploadedBy}
              </TableCell>
              <TableCell sx={{ ...DOCUMENTS_CELL_SX, width: DOCUMENTS_COL_WIDTH.date }}>
                {row.dateStr}
              </TableCell>
              <TableCell sx={{ ...DOCUMENTS_CELL_SX, width: DOCUMENTS_COL_WIDTH.size }}>
                {row.sizeStr ?? '—'}
              </TableCell>
              <TableCell
                sx={{
                  ...DOCUMENTS_CELL_SX,
                  width: DOCUMENTS_COL_WIDTH.action,
                  textAlign: 'right',
                }}
              >
                <RowActions row={row} onDelete={onDelete} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

function SubsectionBlock({
  title,
  rows,
  onDelete,
}: {
  title: string
  rows: ColumnRow[]
  onDelete?: (id: string) => void
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="overline"
        sx={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.6,
          color: 'text.secondary',
          display: 'block',
          mb: 1,
        }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          maxWidth: '100%',
        }}
      >
        <DocumentsTable rows={rows} onDelete={onDelete} />
      </Box>
    </Box>
  )
}

function DocumentGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'text.primary' }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

// ─── Main tab ────────────────────────────────────────────────────────────────

interface DocumentsTabProps {
  project: Project
}

export default function DocumentsTab({ project }: DocumentsTabProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const authUser = useAppSelector((s) => s.auth.user)
  const { invoices, vendorInvoices } = useAppSelector((s) => s.live)
  const listProjects = useAppSelector((s) => s.projects.items)

  const projectForDocuments = useMemo(
    () => resolveProjectForDocuments(project, listProjects),
    [project, listProjects],
  )

  const { uploads, addUpload, removeUpload } = useProjectDocumentUploads(project.id)

  const [filter, setFilter] = useState<DocumentFilter>('all')
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [docName, setDocName] = useState('')
  const [category, setCategory] = useState<UploadCategory | ''>('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [notes, setNotes] = useState('')
  const [formErrors, setFormErrors] = useState<{
    name?: string
    category?: string
  }>({})

  useEffect(() => {
    void dispatch(fetchInvoices(project.id))
    void dispatch(fetchVendorInvoices(project.id))
  }, [dispatch, project.id])

  const projectInvoices = useMemo(
    () => invoices.filter((i) => i.projectId === project.id),
    [invoices, project.id],
  )
  const projectVendorInvoices = useMemo(
    () => vendorInvoices.filter((i) => i.projectId === project.id),
    [vendorInvoices, project.id],
  )

  const uploadsFiltered = useMemo(() => {
    const q = search
    return uploads.filter((u) => {
      if (u.projectId !== project.id) return false
      const blob = [u.displayName, u.fileName, u.notes].join(' ')
      return matchesSearch(blob, q)
    })
  }, [uploads, project.id, search])

  const clientInvoiceRows = useMemo(() => {
    return projectInvoices.filter((inv) =>
      matchesSearch(
        `${inv.invoiceNumber} ${inv.milestoneName} ${inv.serviceName}`,
        search,
      ),
    )
  }, [projectInvoices, search])

  const vendorInvoiceRows = useMemo(() => {
    return projectVendorInvoices.filter((inv) =>
      matchesSearch(
        `${inv.invoiceNumber} ${inv.vendorName} ${inv.serviceName} ${inv.milestoneName}`,
        search,
      ),
    )
  }, [projectVendorInvoices, search])

  const navigateToBilling = useCallback(() => {
    navigate(`/projects/${toSlug(project.name)}#live`, {
      state: { liveSubTab: 'billing' },
    })
  }, [navigate, project.name])

  const buildUploadColumnRow = useCallback(
    (u: UploadedProjectDocument): ColumnRow => ({
      id: u.id,
      name: u.displayName,
      typeLabel: typeLabelForUpload(u.category),
      uploadedBy: u.uploadedBy,
      dateStr: formatDate(u.uploadedAt),
      sizeStr: formatBytes(u.sizeBytes),
      isUpload: true,
      blobUrl: u.blobUrl,
      fileName: u.fileName,
      canDelete: Boolean(authUser?.id && u.uploadedByUserId === authUser.id),
      onView: () => {
        window.open(u.blobUrl, '_blank', 'noopener,noreferrer')
      },
      onDownload: () => {
        const a = document.createElement('a')
        a.href = u.blobUrl
        a.download = u.fileName
        a.click()
      },
    }),
    [authUser],
  )

  const buildClientInvoiceRow = useCallback(
    (inv: ClientInvoice): ColumnRow => ({
      id: `ci-${inv.id}`,
      name: `${inv.invoiceNumber} — ${inv.milestoneName}`,
      typeLabel: 'Invoice',
      uploadedBy: 'System',
      dateStr: formatDate(inv.invoiceDate),
      sizeStr: null,
      isUpload: false,
      canDelete: false,
      onView: navigateToBilling,
    }),
    [navigateToBilling],
  )

  const buildVendorInvoiceRow = useCallback(
    (inv: VendorInvoice): ColumnRow => ({
      id: `vi-${inv.id}`,
      name: `${inv.invoiceNumber} — ${inv.vendorName}`,
      typeLabel: 'Invoice',
      uploadedBy: 'System',
      dateStr: formatDate(inv.invoiceDate),
      sizeStr: null,
      isUpload: false,
      canDelete: false,
      onView: navigateToBilling,
    }),
    [navigateToBilling],
  )

  const pickUploads = (cat: UploadCategory | UploadCategory[]) => {
    const set = Array.isArray(cat) ? cat : [cat]
    return uploadsFiltered.filter((u) => set.includes(u.category))
  }

  const clientQuotations = pickUploads('client_quotation').map(buildUploadColumnRow)
  const clientPO = pickUploads('client_po').map(buildUploadColumnRow)
  const clientInvoices = clientInvoiceRows.map(buildClientInvoiceRow)

  const legacyInternalUploadRows = useMemo(() => {
    return uploads
      .filter(
        (u) =>
          u.projectId === project.id &&
          isLegacyInternalUploadCategory(u.category) &&
          matchesSearch([u.displayName, u.fileName, u.notes].join(' '), search),
      )
      .map(buildUploadColumnRow)
  }, [uploads, project.id, search, buildUploadColumnRow])

  const projectDocumentSections = useMemo(() => {
    const withPersisted = buildProjectDocumentSections(projectForDocuments, {
      alwaysShowSections: true,
    })
    const withLegacy = mergeLegacyInternalUploadRows(
      withPersisted,
      legacyInternalUploadRows,
    )
    return filterProjectDocumentSectionsBySearch(withLegacy, search, matchesSearch)
  }, [projectForDocuments, search, legacyInternalUploadRows])

  /** Rows from Create Project → Project Documents (not manual drawer uploads). */
  const projectFinalDocumentCount = useMemo(
    () => countProjectDocumentRows(buildProjectDocumentSections(projectForDocuments)),
    [projectForDocuments],
  )

  const vendorQuotations = pickUploads('vendor_quotation').map(buildUploadColumnRow)
  const vendorPOs = pickUploads('vendor_po').map(buildUploadColumnRow)
  const vendorInvoiceUploads = pickUploads('vendor_invoice_doc').map(buildUploadColumnRow)
  const vendorInvoicesCombined: ColumnRow[] = [
    ...vendorInvoiceRows.map(buildVendorInvoiceRow),
    ...vendorInvoiceUploads,
  ]

  const handleDelete = (id: string) => {
    removeUpload(id)
  }

  const totalCount = useMemo(() => {
    const uploadCount = uploads.filter((u) => u.projectId === project.id).length
    return (
      uploadCount +
      projectInvoices.length +
      projectVendorInvoices.length +
      projectFinalDocumentCount
    )
  }, [
    uploads,
    project.id,
    projectInvoices.length,
    projectVendorInvoices.length,
    projectFinalDocumentCount,
  ])

  const showProject = filter === 'all' || filter === 'project'
  const showClient = filter === 'all' || filter === 'client'
  const showVendor = filter === 'all' || filter === 'vendor'

  const projectRowCount = projectDocumentSections.reduce((sum, s) => sum + s.rows.length, 0)
  const clientRowCount = clientQuotations.length + clientPO.length + clientInvoices.length
  const vendorRowCount =
    vendorQuotations.length + vendorPOs.length + vendorInvoicesCombined.length

  const visibleRowCount = useMemo(() => {
    let n = 0
    if (showProject) n += projectRowCount
    if (showClient) n += clientRowCount
    if (showVendor) n += vendorRowCount
    return n
  }, [showProject, showClient, showVendor, projectRowCount, clientRowCount, vendorRowCount])

  const projectDocumentContent = projectDocumentSections.map((section) => (
    <SubsectionBlock
      key={section.title}
      title={section.title}
      rows={section.rows}
      onDelete={handleDelete}
    />
  ))

  const clientDocumentContent = (
    <>
      <SubsectionBlock title="Client Quotations" rows={clientQuotations} onDelete={handleDelete} />
      <SubsectionBlock title="Client POs" rows={clientPO} onDelete={handleDelete} />
      <SubsectionBlock title="Client Invoices" rows={clientInvoices} onDelete={handleDelete} />
    </>
  )

  const vendorDocumentContent = (
    <>
      <SubsectionBlock title="Vendor Quotations" rows={vendorQuotations} onDelete={handleDelete} />
      <SubsectionBlock title="Vendor POs" rows={vendorPOs} onDelete={handleDelete} />
      <SubsectionBlock title="Vendor Invoices" rows={vendorInvoicesCombined} onDelete={handleDelete} />
    </>
  )

  const globalEmpty = totalCount === 0
  const hasActiveSearch = search.trim().length > 0
  const noMatches = !globalEmpty && visibleRowCount === 0 && hasActiveSearch
  const showProjectSections =
    showProject && (filter === 'project' || !hasActiveSearch || projectRowCount > 0)

  const openDrawer = () => {
    setFormErrors({})
    setDrawerOpen(true)
  }

  const closeDrawer = () => setDrawerOpen(false)

  useEffect(() => {
    if (!drawerOpen) {
      setDocName('')
      setCategory('')
      setSelectedFiles([])
      setNotes('')
      setFormErrors({})
    }
  }, [drawerOpen])

  const handleSubmit = () => {
    const err: typeof formErrors = {}
    if (!docName.trim()) err.name = 'Document name is required'
    if (!category) err.category = 'Category is required'
    setFormErrors(err)
    if (Object.keys(err).length > 0) return

    const file = selectedFiles[0] ?? null
    const fallbackBlob = new Blob(
      [
        `No file uploaded for "${docName.trim()}".\n`,
        notes.trim() ? `Notes: ${notes.trim()}\n` : '',
      ],
      { type: 'text/plain' },
    )
    const blobUrl = URL.createObjectURL(file ?? fallbackBlob)
    const uid = authUser?.id ?? 'unknown'
    const uname = authUser?.name ?? 'Unknown'
    const fileName = file?.name ?? `${docName.trim().replace(/\s+/g, '_')}.txt`
    const sizeBytes = file?.size ?? fallbackBlob.size

    const next: UploadedProjectDocument = {
      id: crypto.randomUUID(),
      projectId: project.id,
      displayName: docName.trim(),
      category: category as UploadCategory,
      fileName,
      sizeBytes,
      uploadedAt: new Date().toISOString(),
      uploadedBy: uname,
      uploadedByUserId: uid,
      notes: notes.trim(),
      blobUrl,
    }
    addUpload(next)
    closeDrawer()
  }

  const filterToolbar = (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between"
      gap={2}
      sx={{ mb: 2 }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ md: 'center' }} flex={1}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          onChange={(_, v: DocumentFilter | null) => v && setFilter(v)}
          sx={{
            '& .MuiToggleButton-root': {
              fontSize: 12,
              textTransform: 'none',
              px: 1.5,
            },
          }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="client">Client Documents</ToggleButton>
          <ToggleButton value="vendor">Vendor Documents</ToggleButton>
          <ToggleButton value="project">Project Documents</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ minWidth: { md: 220 }, flex: 1 }}>
          <Input
            placeholder="Search documents…"
            value={search}
            onChange={setSearch}
            size="sm"
          />
        </Box>
      </Stack>
      <Button
        variant="contained"
        color="primary"
        size="sm"
        startIcon={<FileUp size={16} strokeWidth={1.75} />}
        onClick={openDrawer}
      >
        Upload Document
      </Button>
    </Stack>
  )

  if (globalEmpty) {
    return (
      <Box>
        {filterToolbar}
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Box sx={{ color: tokens.color.primary[300], mb: 1, display: 'flex', justifyContent: 'center' }}>
            <FileUp size={48} strokeWidth={1.25} />
          </Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
            No documents yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 360, mx: 'auto' }}>
            Upload project documents to keep everything in one place.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="sm"
            startIcon={<FileUp size={16} strokeWidth={1.75} />}
            onClick={openDrawer}
          >
            Upload Document
          </Button>
        </Box>

        <DrawerForm
          open={drawerOpen}
          onClose={closeDrawer}
          title="Upload Document"
          width={480}
          submitLabel="Upload"
          cancelLabel="Cancel"
          onSubmit={handleSubmit}
        >
          <UploadFormBody
            docName={docName}
            setDocName={setDocName}
            category={category}
            setCategory={setCategory}
            setSelectedFiles={setSelectedFiles}
            notes={notes}
            setNotes={setNotes}
            formErrors={formErrors}
          />
        </DrawerForm>
      </Box>
    )
  }

  return (
    <Box>
      {filterToolbar}

      {noMatches && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No matching documents for this filter or search.
        </Typography>
      )}

      <Stack gap={1}>
        {showProjectSections && (
          <DocumentGroup title="Project Documents">{projectDocumentContent}</DocumentGroup>
        )}

        {showClient && (
          <DocumentGroup title="Client Documents">{clientDocumentContent}</DocumentGroup>
        )}

        {showVendor && (
          <DocumentGroup title="Vendor Documents">{vendorDocumentContent}</DocumentGroup>
        )}
      </Stack>

      <DrawerForm
        open={drawerOpen}
        onClose={closeDrawer}
        title="Upload Document"
        width={480}
        submitLabel="Upload"
        cancelLabel="Cancel"
        onSubmit={handleSubmit}
      >
        <UploadFormBody
          docName={docName}
          setDocName={setDocName}
          category={category}
          setCategory={setCategory}
          setSelectedFiles={setSelectedFiles}
          notes={notes}
          setNotes={setNotes}
          formErrors={formErrors}
        />
      </DrawerForm>
    </Box>
  )
}

function UploadFormBody({
  docName,
  setDocName,
  category,
  setCategory,
  setSelectedFiles,
  notes,
  setNotes,
  formErrors,
}: {
  docName: string
  setDocName: (v: string) => void
  category: UploadCategory | ''
  setCategory: (v: UploadCategory | '') => void
  setSelectedFiles: (f: File[]) => void
  notes: string
  setNotes: (v: string) => void
  formErrors: { name?: string; category?: string }
}) {
  return (
    <Stack gap={2}>
      <FormField label="Document Name" required error={formErrors.name}>
        <Input value={docName} onChange={setDocName} size="sm" />
      </FormField>
      <FormField label="Category" required error={formErrors.category}>
        <Select
          placeholder="Select category"
          value={category || undefined}
          onChange={(v) => setCategory(v as UploadCategory)}
          options={CATEGORY_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
          size="sm"
          fullWidth
        />
      </FormField>
      <FormField label="File" hint="Optional">
        <Box sx={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
          <FileUpload
            accept={ACCEPT}
            multiple={false}
            showAcceptText={false}
            onUpload={(files) => setSelectedFiles(files)}
            helperText="PDF, Word, Excel, JPG, PNG"
            sx={{ width: '100%', maxWidth: '100%' }}
          />
        </Box>
      </FormField>
      <FormField label="Notes" hint="Optional">
        <Textarea
          value={notes}
          onChange={setNotes}
          minRows={3}
          placeholder="Add context for your team…"
          fullWidth
        />
      </FormField>
    </Stack>
  )
}
