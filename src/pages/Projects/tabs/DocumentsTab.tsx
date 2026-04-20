/**
 * Project Documents tab — uploads are client-only (extended categories cover every subsection).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
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
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { useNavigate } from 'react-router-dom'
import { FileUp } from 'lucide-react'
import { DrawerForm, FormField } from '../../../components/templates/DrawerForm'
import {
  Badge,
  Button,
  FileUpload,
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

// ─── Types ───────────────────────────────────────────────────────────────────

/** Extends the short category list so every subsection can receive uploads. */
type UploadCategory =
  | 'client_quotation'
  | 'client_po'
  | 'vendor_quotation'
  | 'vendor_po'
  | 'vendor_invoice_doc'
  | 'internal_requirements'
  | 'internal_attachments'
  | 'other'

type DocumentFilter = 'all' | 'client' | 'vendor' | 'internal'

interface UploadedProjectDocument {
  id: string
  projectId: string
  displayName: string
  category: UploadCategory
  fileName: string
  sizeBytes: number
  uploadedAt: string
  uploadedBy: string
  uploadedByUserId: string
  notes: string
  blobUrl: string
}

const ACCEPT =
  '.pdf,.doc,.docx,.xlsx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png'

const CATEGORY_OPTIONS: { value: UploadCategory; label: string }[] = [
  { value: 'client_quotation', label: 'Client Quotation' },
  { value: 'client_po', label: 'Client PO' },
  { value: 'vendor_quotation', label: 'Vendor Quotation' },
  { value: 'vendor_po', label: 'Vendor PO' },
  { value: 'vendor_invoice_doc', label: 'Vendor Invoice (upload)' },
  { value: 'internal_requirements', label: 'Internal — Requirements' },
  { value: 'internal_attachments', label: 'Internal — Attachments' },
  { value: 'other', label: 'Other' },
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

interface ColumnRow {
  id: string
  name: string
  typeLabel: string
  uploadedBy: string
  dateStr: string
  sizeStr: string | null
  isUpload: boolean
  blobUrl?: string
  fileName?: string
  canDelete: boolean
  onView: () => void
  onDownload?: () => void
}

function RowActions({
  row,
  onDelete,
}: {
  row: ColumnRow
  onDelete?: (id: string) => void
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  const openMenu = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    setAnchor(e.currentTarget)
  }
  const close = () => setAnchor(null)

  return (
    <>
      <Stack direction="row" alignItems="center" gap={0.5} justifyContent="flex-end">
        <Button variant="soft" color="primary" size="sm" onClick={row.onView}>
          View
        </Button>
        {row.isUpload && (
          <IconButton size="small" onClick={openMenu} aria-label="More actions">
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Stack>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        {row.onDownload && (
          <MenuItem
            dense
            onClick={() => {
              row.onDownload?.()
              close()
            }}
          >
            Download
          </MenuItem>
        )}
        {row.isUpload && row.canDelete && onDelete && (
          <MenuItem
            dense
            onClick={() => {
              onDelete(row.id)
              close()
            }}
          >
            Delete
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

function DocumentsTable({
  rows,
  onDelete,
}: {
  rows: ColumnRow[]
  onDelete?: (id: string) => void
}) {
  return (
    <Table size="small" sx={{ tableLayout: 'fixed' }}>
      <TableHead>
        <TableRow>
          {['Name', 'Type', 'Uploaded by', 'Date', 'Size', 'Actions'].map((h) => (
            <TableCell
              key={h}
              sx={{
                ...TABLE_HEADER_SX,
                width:
                  h === 'Name'
                    ? '26%'
                    : h === 'Actions'
                      ? '22%'
                      : h === 'Type'
                        ? '14%'
                        : undefined,
              }}
            >
              {h}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} sx={{ ...TABLE_CELL_SX, color: 'text.secondary' }}>
              No documents in this category.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 500 }}>{row.name}</TableCell>
              <TableCell sx={TABLE_CELL_SX}>
                <Badge label={row.typeLabel} color="neutral" size="sm" variant="outlined" />
              </TableCell>
              <TableCell sx={TABLE_CELL_SX}>{row.uploadedBy}</TableCell>
              <TableCell sx={TABLE_CELL_SX}>{row.dateStr}</TableCell>
              <TableCell sx={TABLE_CELL_SX}>{row.sizeStr ?? '—'}</TableCell>
              <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>
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
        }}
      >
        <DocumentsTable rows={rows} onDelete={onDelete} />
      </Box>
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

  const [uploads, setUploads] = useState<UploadedProjectDocument[]>([])
  const uploadsRef = useRef<UploadedProjectDocument[]>([])

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
    file?: string
  }>({})

  useEffect(() => {
    void dispatch(fetchInvoices(project.id))
    void dispatch(fetchVendorInvoices(project.id))
  }, [dispatch, project.id])

  useEffect(() => {
    uploadsRef.current = uploads
  }, [uploads])

  useEffect(() => {
    setUploads((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u.blobUrl))
      return []
    })
  }, [project.id])

  useEffect(() => {
    return () => {
      uploadsRef.current.forEach((u) => URL.revokeObjectURL(u.blobUrl))
    }
  }, [])

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

  const vendorQuotations = pickUploads('vendor_quotation').map(buildUploadColumnRow)
  const vendorPOs = pickUploads('vendor_po').map(buildUploadColumnRow)
  const vendorInvoiceUploads = pickUploads('vendor_invoice_doc').map(buildUploadColumnRow)
  const vendorInvoicesCombined: ColumnRow[] = [
    ...vendorInvoiceRows.map(buildVendorInvoiceRow),
    ...vendorInvoiceUploads,
  ]

  const requirements = pickUploads('internal_requirements').map(buildUploadColumnRow)
  const attachments = [
    ...pickUploads('internal_attachments').map(buildUploadColumnRow),
    ...pickUploads('other').map(buildUploadColumnRow),
  ]

  const handleDelete = (id: string) => {
    setUploads((prev) => {
      const found = prev.find((x) => x.id === id)
      if (found) URL.revokeObjectURL(found.blobUrl)
      return prev.filter((x) => x.id !== id)
    })
  }

  const totalCount =
    uploadsFiltered.length + clientInvoiceRows.length + vendorInvoiceRows.length

  const showClient = filter === 'all' || filter === 'client'
  const showVendor = filter === 'all' || filter === 'vendor'
  const showInternal = filter === 'all' || filter === 'internal'

  const visibleRowCount = useMemo(() => {
    let n = 0
    if (showClient) n += clientQuotations.length + clientPO.length + clientInvoices.length
    if (showVendor)
      n += vendorQuotations.length + vendorPOs.length + vendorInvoicesCombined.length
    if (showInternal) n += requirements.length + attachments.length
    return n
  }, [
    showClient,
    showVendor,
    showInternal,
    clientQuotations.length,
    clientPO.length,
    clientInvoices.length,
    vendorQuotations.length,
    vendorPOs.length,
    vendorInvoicesCombined.length,
    requirements.length,
    attachments.length,
  ])

  const globalEmpty = totalCount === 0
  const noMatches = !globalEmpty && visibleRowCount === 0

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
    if (selectedFiles.length === 0) err.file = 'A file is required'
    setFormErrors(err)
    if (Object.keys(err).length > 0) return

    const file = selectedFiles[0]!
    const blobUrl = URL.createObjectURL(file)
    const uid = authUser?.id ?? 'unknown'
    const uname = authUser?.name ?? 'Unknown'

    const next: UploadedProjectDocument = {
      id: crypto.randomUUID(),
      projectId: project.id,
      displayName: docName.trim(),
      category: category as UploadCategory,
      fileName: file.name,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: uname,
      uploadedByUserId: uid,
      notes: notes.trim(),
      blobUrl,
    }
    setUploads((prev) => [...prev, next])
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
          <ToggleButton value="internal">Internal</ToggleButton>
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
        {showClient && (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'text.primary' }}>
              Client Documents
            </Typography>
            <SubsectionBlock title="Client Quotations" rows={clientQuotations} onDelete={handleDelete} />
            <SubsectionBlock title="Client PO" rows={clientPO} onDelete={handleDelete} />
            <SubsectionBlock title="Client Invoices" rows={clientInvoices} />
          </Box>
        )}

        {showVendor && (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'text.primary' }}>
              Vendor Documents
            </Typography>
            <SubsectionBlock title="Vendor Quotations" rows={vendorQuotations} onDelete={handleDelete} />
            <SubsectionBlock title="Vendor POs" rows={vendorPOs} onDelete={handleDelete} />
            <SubsectionBlock title="Vendor Invoices" rows={vendorInvoicesCombined} onDelete={handleDelete} />
          </Box>
        )}

        {showInternal && (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'text.primary' }}>
              Internal
            </Typography>
            <SubsectionBlock title="Requirements" rows={requirements} onDelete={handleDelete} />
            <SubsectionBlock title="Attachments" rows={attachments} onDelete={handleDelete} />
          </Box>
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
  formErrors: { name?: string; category?: string; file?: string }
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
      <FormField label="File" required error={formErrors.file}>
        <FileUpload
          accept={ACCEPT}
          multiple={false}
          onUpload={(files) => setSelectedFiles(files)}
          helperText="PDF, Word, Excel, JPG, PNG"
        />
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
