/**
 * Project Management → Vendor PO Documents
 * Generate Word PO docs via backend, upload final versions, and track version history.
 */
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  Box,
  IconButton as MuiIconButton,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { Download } from 'lucide-react'
import { DrawerForm, FormField } from '@/components/templates/DrawerForm'
import {
  Button,
  IconButton,
  RadioGroup,
  Select,
  useToast,
} from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { WorkspaceSection } from '@/components/templates'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchVendorPOs } from '@/slices/baseline/thunk'
import type { Project } from '@/slices/projects/reducer'
import type { VendorPO } from '@/slices/baseline/reducer'
import { formatDate } from '@/utils/formatters'
import { liveApi, type GeneratedVendorDocumentApi } from '@/api/liveApi'
import { openAuthenticatedDocument } from '@/utils/openAuthenticatedDocument'
import { ProjectTabSkeleton } from '../components/ProjectTabSkeleton'
import {
  TABLE_CELL_SX,
  TABLE_HEADER_SX,
} from './live/vendorSettlement/utils'
import {
  VENDOR_PO_TEMPLATE_LABELS,
  type VendorPODocTemplate,
} from './generateVendorPODocx'

export type VendorPOGeneratedDocument = GeneratedVendorDocumentApi

interface VendorPODocumentsSectionProps {
  project: Project
}

const TEMPLATE_OPTIONS = [
  { value: 'trade_contract', label: VENDOR_PO_TEMPLATE_LABELS.trade_contract },
  { value: 'supply_installation', label: VENDOR_PO_TEMPLATE_LABELS.supply_installation },
] as const

const COL_WIDTH = {
  name: '22%',
  vendor: '16%',
  template: '14%',
  date: '14%',
  version: '10%',
  by: '14%',
  actions: '10%',
} as const

const CELL_SX = {
  ...TABLE_CELL_SX,
  px: 2,
  py: 1.5,
  verticalAlign: 'middle',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const

const HEADER_SX = {
  ...TABLE_HEADER_SX,
  px: 2,
  py: 1.5,
  verticalAlign: 'middle',
} as const

const MENU_ITEM_SX = { fontSize: 12, py: 0.75 } as const

function latestVersion(doc: VendorPOGeneratedDocument) {
  if (doc.versions.length === 0) return null
  return doc.versions.reduce((best, v) => (v.version > best.version ? v : best))
}

function VendorOptionLabel(po: VendorPO): string {
  return `${po.vendorName} (${po.poNumber})`
}

function DocumentRowActions({
  onDownload,
  onEdit,
  onDelete,
  onView,
}: {
  onDownload: () => void
  onEdit: () => void
  onDelete: () => void
  onView: () => void
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  function open(e: MouseEvent<HTMLElement>) {
    e.stopPropagation()
    setAnchor(e.currentTarget)
  }

  function close() {
    setAnchor(null)
  }

  return (
    <>
      <MuiIconButton size="small" onClick={open} aria-label="Row actions" sx={{ p: 0.5 }}>
        <MoreVertIcon sx={{ fontSize: 16 }} />
      </MuiIconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { elevation: 2 } }}
      >
        <MenuItem
          dense
          sx={MENU_ITEM_SX}
          onClick={() => {
            onDownload()
            close()
          }}
        >
          Download
        </MenuItem>
        <MenuItem
          dense
          sx={MENU_ITEM_SX}
          onClick={() => {
            onEdit()
            close()
          }}
        >
          Edit
        </MenuItem>
        <MenuItem
          dense
          sx={{ ...MENU_ITEM_SX, color: 'error.main' }}
          onClick={() => {
            onDelete()
            close()
          }}
        >
          Delete
        </MenuItem>
        <MenuItem
          dense
          sx={MENU_ITEM_SX}
          onClick={() => {
            onView()
            close()
          }}
        >
          View
        </MenuItem>
      </Menu>
    </>
  )
}

export function VendorPODocumentsSection({ project }: VendorPODocumentsSectionProps) {
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const vendorPOs = useAppSelector((s) => s.baseline.vendorPOs)

  const [vendorPoId, setVendorPoId] = useState('')
  const [template, setTemplate] = useState<VendorPODocTemplate>('trade_contract')
  const [vendorError, setVendorError] = useState<string | undefined>()
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<VendorPOGeneratedDocument[]>([])
  const [historyDoc, setHistoryDoc] = useState<VendorPOGeneratedDocument | null>(null)
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void dispatch(fetchVendorPOs(project.id))
  }, [dispatch, project.id])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setVendorPoId('')
    setHistoryDoc(null)
    setUploadTargetId(null)
    void (async () => {
      try {
        const rows = await liveApi.getGeneratedDocuments(project.id)
        if (!cancelled) setDocuments(rows)
      } catch {
        if (!cancelled) setDocuments([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [project.id])

  const projectVendorPOs = useMemo(
    () => vendorPOs.filter((po) => po.projectId === project.id),
    [vendorPOs, project.id],
  )

  const vendorOptions = useMemo(
    () =>
      projectVendorPOs.map((po) => ({
        value: po.id,
        label: VendorOptionLabel(po),
      })),
    [projectVendorPOs],
  )

  async function handleGenerate() {
    if (!vendorPoId) {
      setVendorError('Vendor is required')
      return
    }
    const po = projectVendorPOs.find((p) => p.id === vendorPoId)
    if (!po) {
      error('Selected vendor PO was not found')
      return
    }

    setGenerating(true)
    try {
      const row = await liveApi.generateVendorDocument(project.id, {
        vendorPoId: po.id,
        template,
      })
      setDocuments((prev) => [row, ...prev.filter((d) => d.id !== row.id)])
      if (row.downloadUrl) void openAuthenticatedDocument(row.downloadUrl)
      success(
        'Document generated',
        'Open the file in Microsoft Word, then upload the final version.',
      )
    } catch {
      error('Failed to generate document')
    } finally {
      setGenerating(false)
    }
  }

  function handleDownload(doc: VendorPOGeneratedDocument) {
    const latest = latestVersion(doc)
    const url = latest?.downloadUrl || doc.downloadUrl
    if (url) void openAuthenticatedDocument(url)
  }

  function handleView(doc: VendorPOGeneratedDocument) {
    setHistoryDoc(doc)
  }

  async function handleDelete(doc: VendorPOGeneratedDocument) {
    try {
      await liveApi.deleteGeneratedDocument(project.id, doc.id)
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      if (historyDoc?.id === doc.id) setHistoryDoc(null)
      success('Document deleted')
    } catch {
      error('Failed to delete document')
    }
  }

  function handleDownloadVersion(version: VendorPOGeneratedDocument['versions'][number]) {
    if (version.downloadUrl) void openAuthenticatedDocument(version.downloadUrl)
  }

  function openUpload(docId: string) {
    setUploadTargetId(docId)
    window.setTimeout(() => fileInputRef.current?.click(), 0)
  }

  async function handleUploadFile(files: FileList | null) {
    const file = files?.[0]
    const targetId = uploadTargetId
    setUploadTargetId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file || !targetId) return

    const isWord =
      /\.(docx?|DOCX?)$/.test(file.name) ||
      file.type === 'application/msword' ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    if (!isWord) {
      error('Please upload a Word document (.doc or .docx)')
      return
    }

    try {
      const updated = await liveApi.uploadGeneratedDocumentVersion(
        project.id,
        targetId,
        file,
      )
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      if (historyDoc?.id === updated.id) setHistoryDoc(updated)
      success('Final version uploaded')
    } catch {
      error('Failed to upload document version')
    }
  }

  if (loading) {
    return (
      <WorkspaceSection title="Vendor PO Documents">
        <ProjectTabSkeleton rows={3} />
      </WorkspaceSection>
    )
  }

  return (
    <WorkspaceSection title="Vendor PO Documents">
      <Stack gap={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          gap={3}
          alignItems={{ md: 'flex-end' }}
          flexWrap="wrap"
        >
          <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 260 }, maxWidth: { md: 360 } }}>
            <FormField label="Vendor" required error={vendorError}>
              <Select
                placeholder={
                  vendorOptions.length === 0 ? 'No vendor POs on this project' : 'Select vendor'
                }
                value={vendorPoId}
                onChange={(v) => {
                  setVendorPoId(String(v))
                  setVendorError(undefined)
                }}
                options={vendorOptions}
                disabled={vendorOptions.length === 0}
                fullWidth
                size="sm"
                error={Boolean(vendorError)}
              />
            </FormField>
          </Box>

          <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 280 } }}>
            <FormField label="Template" required>
              <RadioGroup
                value={template}
                onChange={(v) => setTemplate(v as VendorPODocTemplate)}
                options={[...TEMPLATE_OPTIONS]}
                orientation="horizontal"
                size="sm"
                sx={{
                  '& .MuiFormControlLabel-label': { fontSize: 13 },
                  '& .MuiFormControlLabel-root': { mr: 2.5 },
                }}
              />
            </FormField>
          </Box>

          <Button
            variant="contained"
            color="primary"
            size="sm"
            label={generating ? 'Generating…' : 'Generate Document'}
            onClick={() => void handleGenerate()}
            disabled={generating || vendorOptions.length === 0}
            sx={{ flexShrink: 0, alignSelf: { xs: 'stretch', md: 'flex-end' } }}
          />
        </Stack>

        {vendorOptions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
            Add a Vendor PO on the Live tab to generate documents for this project.
          </Typography>
        ) : null}

        <Box>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: tokens.color.neutral[500],
              mb: 1.5,
            }}
          >
            Generated Documents
          </Typography>

          {documents.length === 0 ? (
            <Box
              sx={{
                py: 4,
                textAlign: 'center',
                border: `1px dashed ${tokens.color.neutral[200]}`,
                borderRadius: '10px',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                No documents generated yet. Select a vendor and template, then generate.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                border: `1px solid ${tokens.color.neutral[200]}`,
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...HEADER_SX, width: COL_WIDTH.name }}>Document</TableCell>
                    <TableCell sx={{ ...HEADER_SX, width: COL_WIDTH.vendor }}>Vendor</TableCell>
                    <TableCell sx={{ ...HEADER_SX, width: COL_WIDTH.template }}>Template</TableCell>
                    <TableCell sx={{ ...HEADER_SX, width: COL_WIDTH.date }}>Generated</TableCell>
                    <TableCell sx={{ ...HEADER_SX, width: COL_WIDTH.version }}>Version</TableCell>
                    <TableCell sx={{ ...HEADER_SX, width: COL_WIDTH.by }}>By</TableCell>
                    <TableCell sx={{ ...HEADER_SX, width: COL_WIDTH.actions, textAlign: 'right' }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.map((doc) => {
                    const latest = latestVersion(doc)
                    return (
                      <TableRow key={doc.id} hover>
                        <TableCell sx={CELL_SX}>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: 12, fontWeight: 600 }}
                            noWrap
                            title={doc.documentName}
                          >
                            {doc.documentName}
                          </Typography>
                        </TableCell>
                        <TableCell sx={CELL_SX}>
                          <Typography variant="body2" sx={{ fontSize: 12 }} noWrap title={doc.vendorName}>
                            {doc.vendorName}
                          </Typography>
                        </TableCell>
                        <TableCell sx={CELL_SX}>
                          {VENDOR_PO_TEMPLATE_LABELS[doc.template]}
                        </TableCell>
                        <TableCell sx={CELL_SX}>{formatDate(doc.generatedAt)}</TableCell>
                        <TableCell sx={CELL_SX}>
                          {latest ? `Version ${latest.version}` : '—'}
                        </TableCell>
                        <TableCell sx={CELL_SX}>
                          <Typography variant="body2" sx={{ fontSize: 12 }} noWrap title={doc.generatedBy}>
                            {doc.generatedBy}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <DocumentRowActions
                              onDownload={() => handleDownload(doc)}
                              onEdit={() => openUpload(doc.id)}
                              onDelete={() => void handleDelete(doc)}
                              onView={() => handleView(doc)}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      </Stack>

      <input
        ref={fileInputRef}
        type="file"
        accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        hidden
        onChange={(e) => void handleUploadFile(e.target.files)}
      />

      <DrawerForm
        open={Boolean(historyDoc)}
        onClose={() => setHistoryDoc(null)}
        title="Version History"
        subtitle={historyDoc?.documentName}
        width={480}
        hideFooter
      >
        {historyDoc ? (
          <Stack gap={1.5}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 0.5 }}>
              {VENDOR_PO_TEMPLATE_LABELS[historyDoc.template]} · {historyDoc.vendorName}
            </Typography>
            {[...historyDoc.versions]
              .sort((a, b) => b.version - a.version)
              .map((v) => (
                <Box
                  key={v.id}
                  sx={{
                    p: 1.5,
                    borderRadius: '10px',
                    border: `1px solid ${tokens.color.neutral[200]}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600 }}>
                      Version {v.version}
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1, fontWeight: 400 }}
                      >
                        {v.source === 'generated' ? 'Generated' : 'Uploaded'}
                      </Typography>
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 0.25 }}
                      noWrap
                      title={v.fileName}
                    >
                      {v.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {formatDate(v.createdAt)} · {v.createdBy}
                    </Typography>
                  </Box>
                  <IconButton
                    size="sm"
                    variant="outlined"
                    color="primary"
                    icon={<Download size={14} strokeWidth={1.75} />}
                    tooltip="Download"
                    onClick={() => handleDownloadVersion(v)}
                  />
                </Box>
              ))}
          </Stack>
        ) : null}
      </DrawerForm>
    </WorkspaceSection>
  )
}
