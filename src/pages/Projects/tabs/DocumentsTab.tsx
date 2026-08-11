/**
 * Project detail Documents tab — grouped by Project, Client, and Vendor document sets.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
import { FileUp, Plus, Trash2 } from 'lucide-react'
import { DrawerForm, FormField } from '../../../components/templates/DrawerForm'
import {
  Badge,
  Button,
  IconButton,
  Input,
  Modal,
  Select,
} from '@/design-system/components'
import { DocumentUploadFormBody } from '@/components/forms/DocumentUploadFormBody'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import type { Project } from '../../../slices/projects/reducer'
import { fetchClientPO, fetchVendorPOs } from '../../../slices/baseline/thunk'
import { fetchVersions } from '../../../slices/pitch/thunk'
import { formatDate } from '../../../utils/formatters'
import {
  TABLE_CELL_SX,
  TABLE_HEADER_SX,
} from './live/vendorSettlement/utils'
import {
  isLegacyInternalUploadCategory,
  openProjectUploadInNewTab,
  useProjectDocumentUploads,
  type UploadCategory,
  type UploadedProjectDocument,
} from '../projectDocumentUploads'
import {
  buildProjectDocumentSections,
  clientPOToDocumentRow,
  collectPitchVendorQuotationRows,
  countProjectDocumentRows,
  filterDocumentRowsBySearch,
  filterProjectDocumentSectionsBySearch,
  mergeDocumentRows,
  mergeLegacyInternalUploadRows,
  resolveProjectForDocuments,
  vendorPOToDocumentRow,
  type ProjectDocumentColumnRow,
} from '../projectDocumentsDisplay'

// ─── Types ───────────────────────────────────────────────────────────────────

type DocumentFilter = 'all' | 'client' | 'vendor' | 'project' | 'others'

type CategoryOption = { value: string; label: string }

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

const BUILTIN_CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'client_documents', label: 'Client Documents' },
  { value: 'vendor_documents', label: 'Vendor Documents' },
  { value: 'project_documents', label: 'Project Documents' },
]

const BUILTIN_TYPE_LABELS: Record<string, string> = {
  client_documents: 'Client Documents',
  vendor_documents: 'Vendor Documents',
  project_documents: 'Project Documents',
  client_quotation: 'Client Quotation',
  client_po: 'Client PO',
  vendor_quotation: 'Vendor Quotation',
  vendor_po: 'Vendor PO',
  vendor_invoice_doc: 'Vendor Invoice',
  internal_requirements: 'Requirements',
  internal_attachments: 'Attachment',
  other: 'Other',
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function slugifyCategoryValue(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return `custom_${slug || 'category'}`
}

function typeLabelForUpload(cat: UploadCategory, customCategories: CategoryOption[]): string {
  const custom = customCategories.find((c) => c.value === cat)
  if (custom) return custom.label
  return BUILTIN_TYPE_LABELS[cat] ?? cat
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
  const authUser = useAppSelector((s) => s.auth.user)
  const listProjects = useAppSelector((s) => s.projects.items ?? [])
  const clientPOs = useAppSelector((s) => s.baseline.clientPOs)
  const vendorPOList = useAppSelector((s) => s.baseline.vendorPOs)
  const pitchActiveVersion = useAppSelector((s) => s.pitch.activeVersion)

  const projectForDocuments = useMemo(
    () => resolveProjectForDocuments(project, listProjects),
    [project, listProjects],
  )

  const { uploads, addUpload, removeUpload } = useProjectDocumentUploads(project.id)

  useEffect(() => {
    void dispatch(fetchClientPO(project.id))
    void dispatch(fetchVendorPOs(project.id))
    void dispatch(fetchVersions(project.id))
  }, [dispatch, project.id])

  const [filter, setFilter] = useState<DocumentFilter>('all')
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [customCategories, setCustomCategories] = useState<CategoryOption[]>([])
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryError, setNewCategoryError] = useState('')

  const [docName, setDocName] = useState('')
  const [category, setCategory] = useState<UploadCategory | ''>('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [notes, setNotes] = useState('')
  const [formErrors, setFormErrors] = useState<{
    name?: string
    category?: string
  }>({})

  const categoryOptions = useMemo(
    () => [...BUILTIN_CATEGORY_OPTIONS, ...customCategories],
    [customCategories],
  )

  const uploadsFiltered = useMemo(() => {
    const q = search
    return uploads.filter((u) => {
      if (u.projectId !== project.id) return false
      const blob = [u.displayName, u.fileName, u.notes].join(' ')
      return matchesSearch(blob, q)
    })
  }, [uploads, project.id, search])

  const buildUploadColumnRow = (u: UploadedProjectDocument): ColumnRow => ({
    id: u.id,
    name: u.displayName,
    typeLabel: typeLabelForUpload(u.category, customCategories),
    uploadedBy: u.uploadedBy,
    dateStr: formatDate(u.uploadedAt),
    sizeStr: formatBytes(u.sizeBytes),
    isUpload: true,
    blobUrl: u.blobUrl,
    fileName: u.fileName,
    canDelete: Boolean(authUser?.id && u.uploadedByUserId === authUser.id),
    onView: () => {
      openProjectUploadInNewTab(u)
    },
    onDownload: () => {
      const a = document.createElement('a')
      a.href = u.blobUrl
      a.download = u.fileName
      a.click()
    },
  })

  const pickUploads = (cat: UploadCategory | UploadCategory[]) => {
    const set = Array.isArray(cat) ? cat : [cat]
    return uploadsFiltered.filter((u) => set.includes(u.category))
  }

  const clientQuotations = useMemo(
    () =>
      filterDocumentRowsBySearch(
        pickUploads('client_quotation').map(buildUploadColumnRow),
        search,
        matchesSearch,
      ),
    [uploadsFiltered, search],
  )

  const clientDocumentUploads = useMemo(
    () =>
      filterDocumentRowsBySearch(
        pickUploads('client_documents').map(buildUploadColumnRow),
        search,
        matchesSearch,
      ),
    [uploadsFiltered, search],
  )

  const baselineClientPORows = useMemo(() => {
    const rows = clientPOs
      .filter((po) => po.projectId === project.id)
      .map(clientPOToDocumentRow)
      .filter((row): row is ProjectDocumentColumnRow => row !== null)
    return filterDocumentRowsBySearch(rows, search, matchesSearch)
  }, [clientPOs, project.id, search])

  const clientPO = useMemo(
    () => mergeDocumentRows(
      pickUploads('client_po').map(buildUploadColumnRow),
      baselineClientPORows,
    ).filter((row) => matchesSearch(`${row.name} ${row.typeLabel}`, search)),
    [uploadsFiltered, baselineClientPORows, search],
  )

  const baselineVendorPORows = useMemo(() => {
    const rows = vendorPOList
      .filter((po) => po.projectId === project.id)
      .map(vendorPOToDocumentRow)
      .filter((row): row is ProjectDocumentColumnRow => row !== null)
    return filterDocumentRowsBySearch(rows, search, matchesSearch)
  }, [vendorPOList, project.id, search])

  const pitchVendorQuotationRows = useMemo(() => {
    const rows = collectPitchVendorQuotationRows(pitchActiveVersion, project.id)
    return filterDocumentRowsBySearch(rows, search, matchesSearch)
  }, [pitchActiveVersion, project.id, search])

  const vendorQuotations = useMemo(
    () =>
      mergeDocumentRows(
        pickUploads('vendor_quotation').map(buildUploadColumnRow),
        pitchVendorQuotationRows,
      ).filter((row) => matchesSearch(`${row.name} ${row.typeLabel}`, search)),
    [uploadsFiltered, pitchVendorQuotationRows, search],
  )

  const vendorPORows = useMemo(
    () =>
      mergeDocumentRows(
        pickUploads('vendor_po').map(buildUploadColumnRow),
        baselineVendorPORows,
      ).filter((row) => matchesSearch(`${row.name} ${row.typeLabel}`, search)),
    [uploadsFiltered, baselineVendorPORows, search],
  )

  const vendorDocumentUploads = useMemo(
    () =>
      filterDocumentRowsBySearch(
        pickUploads('vendor_documents').map(buildUploadColumnRow),
        search,
        matchesSearch,
      ),
    [uploadsFiltered, search],
  )

  const legacyInternalUploadRows = useMemo(() => {
    return uploads
      .filter(
        (u) =>
          u.projectId === project.id &&
          (isLegacyInternalUploadCategory(u.category) || u.category === 'project_documents') &&
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

  const handleDelete = (id: string) => {
    removeUpload(id)
  }

  const baselineDocumentCount = useMemo(() => {
    const clientCount = clientPOs.filter((po) => po.projectId === project.id && po.documentUrl).length
    const vendorCount = vendorPOList.filter((po) => po.projectId === project.id && po.documentUrl).length
    const pitchCount = collectPitchVendorQuotationRows(pitchActiveVersion, project.id).length
    return clientCount + vendorCount + pitchCount
  }, [clientPOs, vendorPOList, pitchActiveVersion, project.id])

  const totalCount = useMemo(() => {
    const uploadCount = uploads.filter((u) => u.projectId === project.id).length
    return uploadCount + projectFinalDocumentCount + baselineDocumentCount
  }, [uploads, project.id, projectFinalDocumentCount, baselineDocumentCount])

  const showProject = filter === 'all' || filter === 'project'
  const showClient = filter === 'all' || filter === 'client'
  const showVendor = filter === 'all' || filter === 'vendor'
  const showOthers = filter === 'all' || filter === 'others'
  const isOthersOnly = filter === 'others'

  const projectRowCount = projectDocumentSections.reduce((sum, s) => sum + s.rows.length, 0)
  const clientRowCount = clientQuotations.length + clientPO.length + clientDocumentUploads.length
  const vendorRowCount = vendorQuotations.length + vendorPORows.length + vendorDocumentUploads.length

  const customCategorySections = useMemo(
    () =>
      customCategories.map((cat) => {
        const rows = filterDocumentRowsBySearch(
          pickUploads(cat.value as UploadCategory).map(buildUploadColumnRow),
          search,
          matchesSearch,
        )
        return { ...cat, rows }
      }),
    [customCategories, uploadsFiltered, search],
  )

  const customRowCount = useMemo(
    () =>
      showOthers
        ? customCategorySections.reduce((sum, s) => sum + s.rows.length, 0)
        : 0,
    [customCategorySections, showOthers],
  )

  const visibleRowCount = useMemo(() => {
    let n = 0
    if (!isOthersOnly) {
      if (showProject) n += projectRowCount
      if (showClient) n += clientRowCount
      if (showVendor) n += vendorRowCount
    }
    if (showOthers) n += customRowCount
    return n
  }, [
    showProject,
    showClient,
    showVendor,
    showOthers,
    isOthersOnly,
    projectRowCount,
    clientRowCount,
    vendorRowCount,
    customRowCount,
  ])

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
      {clientDocumentUploads.length > 0 ? (
        <SubsectionBlock title="Uploads" rows={clientDocumentUploads} onDelete={handleDelete} />
      ) : null}
      <SubsectionBlock title="Client Quotations" rows={clientQuotations} onDelete={handleDelete} />
      <SubsectionBlock title="Client POs" rows={clientPO} onDelete={handleDelete} />
    </>
  )

  const vendorDocumentContent = (
    <>
      {vendorDocumentUploads.length > 0 ? (
        <SubsectionBlock title="Uploads" rows={vendorDocumentUploads} onDelete={handleDelete} />
      ) : null}
      <SubsectionBlock title="Vendor Quotations" rows={vendorQuotations} onDelete={handleDelete} />
      <SubsectionBlock title="Vendor POs" rows={vendorPORows} onDelete={handleDelete} />
    </>
  )

  const globalEmpty = totalCount === 0
  const hasActiveSearch = search.trim().length > 0
  const noMatches = !globalEmpty && visibleRowCount === 0 && hasActiveSearch
  const showProjectSections =
    showProject && !isOthersOnly && (filter === 'project' || projectRowCount > 0)

  const openDrawer = () => {
    setFormErrors({})
    setDrawerOpen(true)
  }

  const closeDrawer = () => setDrawerOpen(false)

  const openAddCategory = () => {
    setNewCategoryName('')
    setNewCategoryError('')
    setAddCategoryOpen(true)
  }

  const closeAddCategory = () => {
    setAddCategoryOpen(false)
    setNewCategoryName('')
    setNewCategoryError('')
  }

  const handleAddCategory = () => {
    const label = newCategoryName.trim()
    if (!label) {
      setNewCategoryError('Category name is required')
      return
    }
    const exists = categoryOptions.some(
      (o) => o.label.toLowerCase() === label.toLowerCase(),
    )
    if (exists) {
      setNewCategoryError('Category already exists')
      return
    }
    let value = slugifyCategoryValue(label)
    const usedValues = new Set(categoryOptions.map((o) => o.value))
    if (usedValues.has(value)) {
      value = `${value}_${Date.now()}`
    }
    setCustomCategories((prev) => [...prev, { value, label }])
    if (drawerOpen) {
      setCategory(value as UploadCategory)
      setFormErrors((prev) => ({ ...prev, category: undefined }))
    }
    closeAddCategory()
  }

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
    addUpload(next, file)
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
          <ToggleButton value="others">Others</ToggleButton>
        </ToggleButtonGroup>
        <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: { md: 220 }, flex: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Input
              placeholder="Search documents…"
              value={search}
              onChange={setSearch}
              size="sm"
            />
          </Box>
        </Stack>
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

  const addCategoryModal = (
    <Modal
      open={addCategoryOpen}
      onClose={closeAddCategory}
      title="Add Category"
      size="xs"
      footer={
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: 1 }}>
          <Button variant="outlined" color="secondary" size="sm" onClick={closeAddCategory}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" size="sm" onClick={handleAddCategory}>
            Add Category
          </Button>
        </Stack>
      }
    >
      <FormField label="Category Name" error={newCategoryError}>
        <Input
          placeholder="e.g. Contracts, Site Photos"
          value={newCategoryName}
          onChange={(v) => {
            setNewCategoryName(v)
            if (newCategoryError) setNewCategoryError('')
          }}
          size="sm"
          error={Boolean(newCategoryError)}
        />
      </FormField>
    </Modal>
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
            categoryOptions={categoryOptions}
            setSelectedFiles={setSelectedFiles}
            notes={notes}
            setNotes={setNotes}
            formErrors={formErrors}
            onAddCategory={openAddCategory}
          />
        </DrawerForm>
        {addCategoryModal}
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

        {showClient && !isOthersOnly && (
          <DocumentGroup title="Client Documents">{clientDocumentContent}</DocumentGroup>
        )}

        {showVendor && !isOthersOnly && (
          <DocumentGroup title="Vendor Documents">{vendorDocumentContent}</DocumentGroup>
        )}

        {customCategorySections.map((section) => {
          if (!showOthers) return null
          if (section.rows.length === 0 && filter === 'all') return null
          return (
            <DocumentGroup key={section.value} title={section.label}>
              <SubsectionBlock
                title="Uploads"
                rows={section.rows}
                onDelete={handleDelete}
              />
            </DocumentGroup>
          )
        })}
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
          categoryOptions={categoryOptions}
          setSelectedFiles={setSelectedFiles}
          notes={notes}
          setNotes={setNotes}
          formErrors={formErrors}
          onAddCategory={openAddCategory}
        />
      </DrawerForm>
      {addCategoryModal}
    </Box>
  )
}

function UploadFormBody({
  docName,
  setDocName,
  category,
  setCategory,
  categoryOptions,
  setSelectedFiles,
  notes,
  setNotes,
  formErrors,
  uploadResetKey,
  onAddCategory,
}: {
  docName: string
  setDocName: (v: string) => void
  category: UploadCategory | ''
  setCategory: (v: UploadCategory | '') => void
  categoryOptions: CategoryOption[]
  setSelectedFiles: (f: File[]) => void
  notes: string
  setNotes: (v: string) => void
  formErrors: { name?: string; category?: string }
  uploadResetKey?: number
  onAddCategory?: () => void
}) {
  return (
    <DocumentUploadFormBody
      docName={docName}
      onDocNameChange={setDocName}
      onFilesChange={setSelectedFiles}
      notes={notes}
      onNotesChange={setNotes}
      nameError={formErrors.name}
      uploadResetKey={uploadResetKey}
      middleSlot={
        <FormField label="Category" required error={formErrors.category}>
          <Select
            placeholder="Select category"
            value={category || undefined}
            onChange={(v) => {
              if (v === '__add_category__') {
                onAddCategory?.()
                return
              }
              setCategory(v as UploadCategory)
            }}
            options={[
              ...categoryOptions.map((o) => ({ label: o.label, value: o.value })),
              ...(onAddCategory
                ? [
                    {
                      label: 'Add others',
                      value: '__add_category__',
                      icon: (
                        <Plus
                          size={14}
                          strokeWidth={1.75}
                          color={tokens.color.success[700]}
                        />
                      ),
                      sx: {
                        color: tokens.color.success[700],
                        fontWeight: 600,
                      },
                    },
                  ]
                : []),
            ]}
            size="sm"
            fullWidth
          />
        </FormField>
      }
    />
  )
}
