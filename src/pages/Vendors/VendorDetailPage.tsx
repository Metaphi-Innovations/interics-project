import { useState, useEffect } from 'react'
import {
  Box,
  Stack,
  Typography,
  Chip as MuiChip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton as MuiIconButton,
} from '@mui/material'
import {
  Edit,
  Phone,
  Email,
  FolderOpen,
  Add,
  Delete,
  StarBorder,
  Star,
  Person,
} from '@mui/icons-material'
import { FileUp, History } from 'lucide-react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchVendorById, updateVendor, setVendorActive, createVendorContact, updateVendorContact, deleteVendorContact } from '../../slices/vendors/thunk'
import { applyVendorPatch, clearSelected } from '../../slices/vendors/reducer'
import type {
  Vendor,
} from '../../slices/vendors/reducer'
import type { ActivityEntry, Contact } from '../../slices/customers/reducer'
import { WorkspaceDetail, WorkspaceSection } from '../../components/templates'
import { VendorDrawer } from './VendorDrawer'
import { ContactDrawer } from '../../components/ContactDrawer'
import { ComplianceDocumentsUploadModal } from './ComplianceDocumentsUploadModal'
import { EditVendorRatingModal } from './EditVendorRatingModal'
import type { ComplianceDocumentUploadValues } from './ComplianceDocumentsUploadModal'
import {
  UploadedCompliancePreviewStack,
} from './VendorAdditionalComplianceSection'
import type { UploadedCompliancePreview } from './VendorAdditionalComplianceSection'
import { StatusBadge, useToast, Button } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { vendorsService, toActivityEntry, type VendorFormInput } from '@/modules/vendors'
import type { VendorLinkedProject } from '@/modules/vendors/vendors.service'
import { downloadAuthenticatedDocument } from '@/utils/openAuthenticatedDocument'
import {
  getInitials,
  getAvatarColor,
  formatInr,
} from '../../utils/formatters'
import {
  normalizeContacts,
  legacyContactsFromVendor,
} from '../../utils/vendorContacts'
import { tokens } from '@/design-system/tokens'
import { useTheme, alpha } from '@mui/material/styles'
import {
  buildComplianceDeletePatch,
  buildGenericComplianceUploadPatch,
  COMPLIANCE_EMPTY_DOC_MESSAGES,
  getInsuranceExpiryDate,
  getVendorComplianceRegistrationDoc,
  resolveComplianceDocKeyFromDocumentName,
  type ComplianceRegistrationDocKey,
} from '../../utils/vendorComplianceDocuments'
import type { VendorDocumentFiles } from '@/modules/vendors/vendors.types'
import {
  getRecordDetailFlatSectionSx,
  RecordDetailSectionTitle,
  formatFullAddress,
  getRecordTagChipColors,
  gstStatusHeaderPillSx,
  type ActivityFilterCategory,
  getActivityTimelineVisual,
  formatActivityTimestamp,
  RecordDetailTaxDocCard,
} from '../workspace/recordDetailTabUtils'
import { getRatingMasterChipColors } from '../../utils/masterChipStyles'

// ── Helpers ───────────────────────────────────────────────────────────────────

function LabelValue({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme()
  return (
    <Box>
      <Typography
        component="div"
        sx={{
          fontSize: 10,
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          display: 'block',
          mb: theme.spacing(0.75),
        }}
      >
        {label}
      </Typography>
      <Box sx={{ mt: theme.spacing(0.25) }}>{children}</Box>
    </Box>
  )
}

function VendorProfileRating({
  vendor,
  onEdit,
}: {
  vendor: Vendor
  onEdit?: () => void
}) {
  const theme = useTheme()
  const rating = vendor.rating?.trim() || null

  if (!rating) {
    return (
      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
        <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: 12 }}>
          Not Rated
        </Typography>
        {onEdit ? (
          <Button variant="text" size="sm" label="Add rating" onClick={onEdit} />
        ) : null}
      </Stack>
    )
  }

  const mode = theme.palette.mode === 'dark' ? 'dark' : 'light'
  const colors = getRatingMasterChipColors(rating, mode)

  return (
    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
      <MuiChip
        label={rating}
        size="small"
        sx={{
          height: 22,
          fontSize: 11,
          fontWeight: 600,
          bgcolor: colors.bg,
          color: colors.color,
          border: 'none',
          borderRadius: '20px',
          '& .MuiChip-label': { px: '10px' },
        }}
      />
    </Stack>
  )
}

function DetailSkeleton() {
  return (
    <Box>
      <Skeleton height={20} width={200} sx={{ mb: 1.5 }} />
      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2, mb: 1.5 }} />
      <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 2, mb: 2 }} />
      <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
    </Box>
  )
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h6" fontWeight={600}>Vendor not found</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        The vendor you are looking for does not exist or has been removed.
      </Typography>
      <Box
        component="span"
        onClick={() => navigate('/vendors')}
        sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}
      >
        Back to Vendors
      </Box>
    </Box>
  )
}

const ACTIVITY_FILTER_OPTIONS: { id: ActivityFilterCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'profile', label: 'Profile' },
  { id: 'documents', label: 'Documents' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'financial', label: 'Financial' },
  { id: 'system', label: 'System' },
]

const VENDOR_DETAIL_TAB_VALUES = ['overview', 'contacts', 'documents-compliance', 'projects', 'activity'] as const

// ── VendorDetailPage ──────────────────────────────────────────────────────────

export default function VendorDetailPage() {
  const { id: slug } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const dispatch = useAppDispatch()
  const vendor = useAppSelector((s) => s.vendors.selectedItem)
  const saving = useAppSelector((s) => s.vendors.saving)
  const authUser = useAppSelector((s) => s.auth.user)
  const { showToast } = useToast()
  const theme = useTheme()

  const [activeTab, setActiveTab] = useState<(typeof VENDOR_DETAIL_TAB_VALUES)[number]>('overview')
  const [localLoading, setLocalLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [activityFilter, setActivityFilter] = useState<ActivityFilterCategory>('all')
  const [activityItems, setActivityItems] = useState<ActivityEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [linkedProjects, setLinkedProjects] = useState<VendorLinkedProject[]>([])
  const [linkedProjectsLoading, setLinkedProjectsLoading] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [localUploadedDocs, setLocalUploadedDocs] = useState<UploadedCompliancePreview[]>([])
  const [ratingModalOpen, setRatingModalOpen] = useState(false)

  useEffect(() => {
    if (!slug) return
    dispatch(clearSelected())
    setLocalLoading(true)
    setNotFound(false)
    dispatch(fetchVendorById(slug))
      .unwrap()
      .then(() => setLocalLoading(false))
      .catch(() => {
        setNotFound(true)
        setLocalLoading(false)
      })
  }, [slug, dispatch])

  useEffect(() => {
    if (!vendor) return
    const seed = vendor.contacts?.length ? vendor.contacts : legacyContactsFromVendor(vendor)
    setContacts(normalizeContacts(seed))
  }, [vendor])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && (VENDOR_DETAIL_TAB_VALUES as readonly string[]).includes(tab)) {
      setActiveTab(tab as (typeof VENDOR_DETAIL_TAB_VALUES)[number])
    }
  }, [searchParams])

  useEffect(() => {
    if (!vendor || activeTab !== 'activity') return
    let cancelled = false
    setActivityLoading(true)
    const type = activityFilter === 'all' ? 'ALL' : activityFilter.toUpperCase()
    void vendorsService
      .getActivity(vendor.id, { type, activityPage: 1, activityLimit: 50 })
      .then((section) => {
        if (cancelled) return
        const items = Array.isArray(section?.items) ? section.items : []
        setActivityItems(items.map(toActivityEntry))
      })
      .catch(() => {
        if (cancelled) return
        setActivityItems([])
        showToast({ title: 'Failed to load activity', variant: 'error' })
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [vendor, activeTab, activityFilter])

  useEffect(() => {
    if (!vendor || activeTab !== 'projects') return
    let cancelled = false
    setLinkedProjectsLoading(true)
    void vendorsService
      .getLinkedProjects(vendor.id)
      .then((items) => {
        if (!cancelled) setLinkedProjects(items)
      })
      .catch(() => {
        if (cancelled) return
        setLinkedProjects([])
        showToast({ title: 'Failed to load linked projects', variant: 'error' })
      })
      .finally(() => {
        if (!cancelled) setLinkedProjectsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [vendor, activeTab])

  useEffect(() => {
    setLocalUploadedDocs([])
  }, [vendor?.id])

  async function handleComplianceUpload(values: ComplianceDocumentUploadValues) {
    if (!vendor) return

    if (!values.file) {
      showToast({ title: 'Please select a file to upload', variant: 'error' })
      return
    }

    const docKey = resolveComplianceDocKeyFromDocumentName(values.documentName)
    if (!docKey) {
      showToast({
        title: 'Use GST, PAN, Cheque, Insurance, or Catalogue in the document name',
        variant: 'error',
      })
      return
    }

    const files: VendorDocumentFiles = {}
    switch (docKey) {
      case 'gst':
        files.gstCertificate = values.file
        break
      case 'pan':
        files.panCard = values.file
        break
      case 'bank_cheque':
        files.cancelledCheque = values.file
        break
      case 'insurance':
        files.insuranceDocument = values.file
        break
      case 'catalogue':
        files.catalogue = values.file
        break
      default:
        break
    }

    const hadExisting = getVendorComplianceRegistrationDoc(vendor, docKey) !== null
    const uploadedBy = authUser?.name ?? 'Current User'
    const optimistic = buildGenericComplianceUploadPatch(vendor, {
      documentName: values.documentName,
      file: values.file,
      notes: values.notes,
      uploadedBy,
      expiryDate: values.expiryDate,
    })
    dispatch(applyVendorPatch({ id: vendor.id, patch: optimistic }))
    setUploadModalOpen(false)

    try {
      await vendorsService.updateDocuments(vendor.id, {
        files,
        insuranceExpiryDate:
          docKey === 'insurance'
            ? values.expiryDate ?? getInsuranceExpiryDate(vendor)
            : undefined,
      })
      await dispatch(fetchVendorById(vendor.id)).unwrap()
      showToast({
        title: hadExisting ? 'Document updated successfully.' : 'Document uploaded successfully.',
        variant: 'success',
      })
    } catch {
      void dispatch(fetchVendorById(vendor.id))
      showToast({ title: 'Failed to upload document', variant: 'error' })
    }
  }

  async function handleToggleStatus() {
    if (!vendor) return
    const nextActive = vendor.status !== 'Active'
    try {
      await dispatch(setVendorActive({ id: vendor.id, isActive: nextActive })).unwrap()
      showToast({ title: `Vendor ${nextActive ? 'activated' : 'deactivated'}`, variant: 'success' })
      void dispatch(fetchVendorById(vendor.id))
    } catch {
      showToast({ title: 'Failed to update status', variant: 'error' })
    }
  }

  async function handleRatingSave(newRating: string) {
    if (!vendor) return
    try {
      const updated = await dispatch(
        updateVendor({ id: vendor.id, data: { rating: newRating } }),
      ).unwrap()
      if (updated.rating !== newRating) {
        // Ensure Redux reflects the saved rating even if merge edge-cases occur
        dispatch(applyVendorPatch({ id: vendor.id, patch: { rating: newRating } }))
      }
      showToast({ title: 'Vendor rating updated successfully.', variant: 'success' })
      setRatingModalOpen(false)
    } catch {
      showToast({ title: 'Failed to update rating', variant: 'error' })
    }
  }

  function handleEditRating() {
    setRatingModalOpen(true)
  }

  function openTaxDocument(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function downloadTaxDocument(url: string, fileName?: string) {
    await downloadAuthenticatedDocument(url, fileName, () => {
      showToast({ title: 'Failed to download document', variant: 'error' })
    })
  }

  function docKeyToRemovable(
    docKey: ComplianceRegistrationDocKey,
  ): NonNullable<VendorFormInput['removeDocuments']>[number] {
    switch (docKey) {
      case 'gst':
        return 'GST_CERTIFICATE'
      case 'pan':
        return 'PAN_CARD'
      case 'bank_cheque':
        return 'CANCELLED_CHEQUE'
      case 'insurance':
        return 'INSURANCE_DOCUMENT'
      case 'catalogue':
        return 'CATALOGUE'
    }
  }

  async function handleDeleteComplianceDoc(docKey: ComplianceRegistrationDocKey) {
    if (!vendor || !getVendorComplianceRegistrationDoc(vendor, docKey)) return

    const deletedBy = authUser?.name ?? 'Current User'
    const patch = buildComplianceDeletePatch(vendor, docKey, deletedBy)
    dispatch(applyVendorPatch({ id: vendor.id, patch }))
    setLocalUploadedDocs((prev) => {
      const next = prev.filter(
        (item) => resolveComplianceDocKeyFromDocumentName(item.name) !== docKey,
      )
      for (const item of prev) {
        if (
          resolveComplianceDocKeyFromDocumentName(item.name) === docKey &&
          item.blobUrl
        ) {
          URL.revokeObjectURL(item.blobUrl)
        }
      }
      return next
    })

    try {
      await vendorsService.updateDocuments(vendor.id, {
        removeDocuments: [docKeyToRemovable(docKey)],
      })
      await dispatch(fetchVendorById(vendor.id)).unwrap()
      showToast({ title: 'Document removed successfully.', variant: 'success' })
    } catch {
      void dispatch(fetchVendorById(vendor.id))
      showToast({ title: 'Failed to remove document', variant: 'error' })
    }
  }

  function handleDeleteUploadedPreview(id: string) {
    const preview = localUploadedDocs.find((item) => item.id === id)
    const docKey = preview
      ? resolveComplianceDocKeyFromDocumentName(preview.name)
      : null

    if (docKey && vendor && getVendorComplianceRegistrationDoc(vendor, docKey)) {
      void handleDeleteComplianceDoc(docKey)
      return
    }

    setLocalUploadedDocs((prev) => {
      const doc = prev.find((item) => item.id === id)
      if (doc?.blobUrl) URL.revokeObjectURL(doc.blobUrl)
      return prev.filter((item) => item.id !== id)
    })
    showToast({ title: 'Document removed successfully.', variant: 'success' })
  }

  function complianceDocDeleteHandler(docKey: ComplianceRegistrationDocKey) {
    return getVendorComplianceRegistrationDoc(vendor!, docKey)
      ? () => { void handleDeleteComplianceDoc(docKey) }
      : undefined
  }

  async function reloadContacts() {
    if (!vendor) return
    await dispatch(fetchVendorById(vendor.id)).unwrap()
  }

  async function handleSaveContact(data: Omit<Contact, 'id'> & { id?: string }) {
    if (!vendor) return
    try {
      if (data.id && !data.id.startsWith('vc-local-') && !data.id.startsWith('pending-')) {
        await dispatch(
          updateVendorContact({
            vendorId: vendor.id,
            contactId: data.id,
            data: {
              name: data.name,
              designation: data.designation,
              phone: data.phone,
              email: data.email,
              isPrimary: data.isPrimary,
            },
          }),
        ).unwrap()
        showToast({ title: 'Contact updated', variant: 'success' })
      } else {
        await dispatch(
          createVendorContact({
            vendorId: vendor.id,
            data: {
              name: data.name,
              designation: data.designation,
              phone: data.phone,
              email: data.email,
              isPrimary: data.isPrimary || contacts.length === 0,
            },
          }),
        ).unwrap()
        showToast({ title: 'Contact added', variant: 'success' })
      }
      setContactDrawerOpen(false)
      setEditingContact(null)
      await reloadContacts()
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to save contact'
      showToast({ title: message, variant: 'error' })
    }
  }

  async function handleSetPrimary(contactId: string) {
    if (!vendor) return
    try {
      await dispatch(
        updateVendorContact({
          vendorId: vendor.id,
          contactId,
          data: { isPrimary: true },
        }),
      ).unwrap()
      await reloadContacts()
      showToast({ title: 'Primary contact updated', variant: 'success' })
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to update primary contact'
      showToast({ title: message, variant: 'error' })
    }
  }

  async function handleDeleteContact(contact: Contact) {
    if (!vendor) return
    try {
      await dispatch(
        deleteVendorContact({ vendorId: vendor.id, contactId: contact.id }),
      ).unwrap()
      await reloadContacts()
      showToast({ title: 'Contact removed', variant: 'success' })
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to remove contact'
      showToast({ title: message, variant: 'error' })
    }
  }

  if (localLoading) return <DetailSkeleton />
  if (notFound || !vendor) return <NotFound />

  const tabs = [
    { label: 'Overview', value: 'overview' },
    { label: 'Contacts', value: 'contacts' },
    { label: 'Documents & Compliance', value: 'documents-compliance' },
    { label: 'Linked Projects', value: 'projects' },
    { label: 'Activity', value: 'activity' },
  ]

  // ── renderOverview ─────────────────────────────────────────────────────────

  function renderOverview() {
    const gstRegistered = vendor!.gstStatus === 'Registered'
    const gstPill = gstStatusHeaderPillSx(gstRegistered, theme)
    const mono =
      (theme.typography as { fontFamilyMonospace?: string }).fontFamilyMonospace ?? `'Courier New', monospace`
    const billingAddressStr = formatFullAddress(
      vendor!.address,
      vendor!.city,
      vendor!.state,
      vendor!.pincode,
    ).trim()

    return (
      <Stack gap={0}>
          <Box
            sx={{
              ...getRecordDetailFlatSectionSx(theme, { isLast: false }),
              mb: theme.spacing(3),
              pb: theme.spacing(3),
            }}
          >
            <RecordDetailSectionTitle>Vendor profile</RecordDetailSectionTitle>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: theme.spacing(3),
                rowGap: theme.spacing(3.5),
                py: theme.spacing(0.5),
              }}
            >
              <LabelValue label="Vendor name">
                <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, fontSize: theme.typography.body2.fontSize }}>
                  {vendor!.name}
                </Typography>
              </LabelValue>
              <LabelValue label="Status">
                <StatusBadge status={vendor!.status.toLowerCase() as StatusType} />
              </LabelValue>
              <LabelValue label="GST status">
                <Box
                  component="span"
                  sx={{
                    ...gstPill,
                    fontSize: theme.typography.caption.fontSize,
                    fontWeight: 600,
                    px: theme.spacing(1),
                    py: theme.spacing(0.5),
                    borderRadius: tokens.borderRadius.md,
                    lineHeight: 1.2,
                    display: 'inline-block',
                  }}
                >
                  {vendor!.gstStatus}
                </Box>
              </LabelValue>
              <LabelValue label="GSTIN">
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: mono,
                    letterSpacing: '0.5px',
                    color: 'text.primary',
                    fontWeight: 500,
                    fontSize: theme.typography.body2.fontSize,
                  }}
                >
                  {vendor!.gstin ?? '—'}
                </Typography>
              </LabelValue>
              <LabelValue label="PAN">
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: mono,
                    letterSpacing: '0.5px',
                    color: 'text.primary',
                    fontWeight: 500,
                    fontSize: theme.typography.body2.fontSize,
                  }}
                >
                  {vendor!.pan ?? '—'}
                </Typography>
              </LabelValue>
              <LabelValue label="Rating">
                <VendorProfileRating vendor={vendor!} onEdit={() => setRatingModalOpen(true)} />
              </LabelValue>
            </Box>
          </Box>

          <Box
            sx={{
              ...getRecordDetailFlatSectionSx(theme, { isLast: false }),
              mb: theme.spacing(3),
              pb: theme.spacing(3),
            }}
          >
            <RecordDetailSectionTitle>Billing address</RecordDetailSectionTitle>
            {billingAddressStr ? (
              <Typography
                variant="body2"
                sx={{ color: 'text.primary', fontWeight: 500, fontSize: theme.typography.body2.fontSize, whiteSpace: 'pre-line' }}
              >
                {billingAddressStr}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.disabled">
                No billing address added
              </Typography>
            )}
          </Box>

          <Box sx={getRecordDetailFlatSectionSx(theme, { isLast: true })}>
            <RecordDetailSectionTitle>Specialization</RecordDetailSectionTitle>
            {vendor!.tags.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={theme.spacing(0.75)}>
                {vendor!.tags.map((tag) => {
                  const c = getRecordTagChipColors(tag, theme)
                  return (
                    <MuiChip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="filled"
                      sx={{
                        bgcolor: c.bg,
                        color: c.color,
                        fontWeight: 600,
                        fontSize: theme.typography.caption.fontSize,
                        borderRadius: tokens.borderRadius.lg,
                        border: 'none',
                        height: 22,
                      }}
                    />
                  )
                })}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.disabled">
                No specialization tags
              </Typography>
            )}
          </Box>
      </Stack>
    )
  }

  // ── renderDocumentsCompliance ───────────────────────────────────────────────

  function renderDocumentsCompliance() {
    const onCopy = () => showToast({ title: 'Copied to clipboard', variant: 'success' })
    const insExpiry = getInsuranceExpiryDate(vendor!)
    const gstDoc = getVendorComplianceRegistrationDoc(vendor!, 'gst')
    const panDoc = getVendorComplianceRegistrationDoc(vendor!, 'pan')
    const bankDoc = getVendorComplianceRegistrationDoc(vendor!, 'bank_cheque')
    const insuranceDoc = getVendorComplianceRegistrationDoc(vendor!, 'insurance')
    const catalogueDoc = getVendorComplianceRegistrationDoc(vendor!, 'catalogue')

    function fmtTs(iso: string) {
      try {
        return new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
        }).format(new Date(iso))
      } catch {
        return iso
      }
    }

    const hasRegistrationDocs =
      Boolean(gstDoc || panDoc || bankDoc || catalogueDoc || insuranceDoc) ||
      localUploadedDocs.length > 0

    return (
      <Stack gap={theme.spacing(2)}>
        <WorkspaceSection
          title="Compliance registration"
          action={
            <Button
              variant="outlined"
              color="secondary"
              size="sm"
              label="Upload Document"
              startIcon={<FileUp size={14} strokeWidth={1.75} />}
              onClick={() => setUploadModalOpen(true)}
            />
          }
        >
          {hasRegistrationDocs ? (
            <Box
              sx={{
                display: 'grid',
                gap: theme.spacing(1.5),
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                alignItems: 'start',
              }}
            >
              {gstDoc ? (
                <RecordDetailTaxDocCard
                  variant="gst"
                  title="GST Registration"
                  showHeaderIcon={false}
                  showUploadMeta={false}
                  fieldLabel="GSTIN"
                  fieldValue={vendor!.gstin}
                  document={gstDoc}
                  emptyDocMessage={COMPLIANCE_EMPTY_DOC_MESSAGES.gst}
                  onView={openTaxDocument}
                  onDownload={(url) => { void downloadTaxDocument(url, gstDoc.name) }}
                  onCopySuccess={onCopy}
                  onDelete={complianceDocDeleteHandler('gst')}
                />
              ) : null}
              {panDoc ? (
                <RecordDetailTaxDocCard
                  variant="pan"
                  title="PAN / Income Tax"
                  showHeaderIcon={false}
                  showUploadMeta={false}
                  fieldLabel="PAN Number"
                  fieldValue={vendor!.pan}
                  document={panDoc}
                  emptyDocMessage={COMPLIANCE_EMPTY_DOC_MESSAGES.pan}
                  onView={openTaxDocument}
                  onDownload={(url) => { void downloadTaxDocument(url, panDoc.name) }}
                  onCopySuccess={onCopy}
                  onDelete={complianceDocDeleteHandler('pan')}
                />
              ) : null}
              {bankDoc ? (
                <RecordDetailTaxDocCard
                  variant="cheque"
                  title="Bank Cancelled Cheque"
                  showHeaderIcon={false}
                  showUploadMeta={false}
                  fieldLabel="Verification document"
                  fieldValue="—"
                  document={bankDoc}
                  emptyDocMessage={COMPLIANCE_EMPTY_DOC_MESSAGES.bank_cheque}
                  onView={openTaxDocument}
                  onDownload={(url) => { void downloadTaxDocument(url, bankDoc.name) }}
                  onCopySuccess={onCopy}
                  onDelete={complianceDocDeleteHandler('bank_cheque')}
                />
              ) : null}
              {catalogueDoc ? (
                <RecordDetailTaxDocCard
                  variant="catalogue"
                  title="Catalogue"
                  showHeaderIcon={false}
                  showUploadMeta={false}
                  fieldLabel="Uploaded"
                  fieldValue={catalogueDoc.uploadedOn ? fmtTs(catalogueDoc.uploadedOn) : null}
                  document={catalogueDoc}
                  emptyDocMessage={COMPLIANCE_EMPTY_DOC_MESSAGES.catalogue}
                  onView={openTaxDocument}
                  onDownload={(url) => { void downloadTaxDocument(url, catalogueDoc.name) }}
                  onCopySuccess={onCopy}
                  onDelete={complianceDocDeleteHandler('catalogue')}
                />
              ) : null}
              {insuranceDoc ? (
                <RecordDetailTaxDocCard
                  variant="insurance"
                  title="Insurance"
                  showHeaderIcon={false}
                  showUploadMeta={false}
                  fieldLabel={insExpiry ? 'Policy expiry' : 'Coverage'}
                  fieldValue={insExpiry ? fmtTs(insExpiry) : 'General liability'}
                  document={insuranceDoc}
                  emptyDocMessage={COMPLIANCE_EMPTY_DOC_MESSAGES.insurance}
                  onView={openTaxDocument}
                  onDownload={(url) => { void downloadTaxDocument(url, insuranceDoc.name) }}
                  onCopySuccess={onCopy}
                  onDelete={complianceDocDeleteHandler('insurance')}
                />
              ) : null}
              <UploadedCompliancePreviewStack
                documents={localUploadedDocs}
                onView={openTaxDocument}
                onDownload={(url) => { void downloadTaxDocument(url) }}
                onCopySuccess={onCopy}
                onDelete={handleDeleteUploadedPreview}
                stackTopSpacing={false}
              />
            </Box>
          ) : (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No compliance documents uploaded yet.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Use Upload Document to add GST, PAN, and other compliance records.
              </Typography>
            </Box>
          )}
        </WorkspaceSection>
      </Stack>
    )
  }

  // ── renderContacts ─────────────────────────────────────────────────────────

  function renderContacts() {
    return (
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </Typography>
          <Button variant="contained" color="primary" size="sm" onClick={() => { setEditingContact(null); setContactDrawerOpen(true) }}>
            <Add sx={{ fontSize: 14, mr: 0.5 }} /> Add Contact
          </Button>
        </Stack>

        {contacts.length === 0 ? (
          <WorkspaceSection>
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Person sx={{ fontSize: 36, color: tokens.color.neutral[300], mb: 1 }} />
              <Typography variant="body2" fontWeight={500}>No contacts yet</Typography>
              <Typography variant="caption" color="text.secondary">
                Add contacts to keep track of key people for this vendor
              </Typography>
            </Box>
          </WorkspaceSection>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
              gap: 1.5,
            }}
          >
            {contacts.map((contact) => (
              <Box
                key={contact.id}
                sx={{
                  p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                  bgcolor: contact.isPrimary ? alpha(theme.palette.primary.main, 0.03) : 'background.paper',
                  height: '100%',
                  minWidth: 0,
                }}
              >
                <Stack direction="row" alignItems="flex-start" gap={2}>
                  <Box
                    sx={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      bgcolor: getAvatarColor(contact.name).bg,
                      color: getAvatarColor(contact.name).text,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {getInitials(contact.name)}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="body2" fontWeight={600}>{contact.name}</Typography>
                      {contact.isPrimary ? (
                        <Typography
                          variant="caption"
                          sx={{ fontSize: 10, fontWeight: 600, color: 'primary.main', letterSpacing: 0.3 }}
                        >
                          (Primary Contact)
                        </Typography>
                      ) : null}
                    </Stack>
                    {contact.designation && (
                      <Typography variant="caption" color="text.secondary">{contact.designation}</Typography>
                    )}
                    <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap" sx={{ mt: 0.75 }}>
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <Phone sx={{ fontSize: 11, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontSize: 12 }}>{contact.phone}</Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <Email sx={{ fontSize: 11, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontSize: 12 }}>{contact.email}</Typography>
                      </Stack>
                    </Stack>
                  </Box>
                  <Stack direction="row" gap={0.5} sx={{ flexShrink: 0 }}>
                    <MuiIconButton size="small" title="Edit contact"
                      onClick={() => { setEditingContact(contact); setContactDrawerOpen(true) }}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                    >
                      <Edit sx={{ fontSize: 15 }} />
                    </MuiIconButton>
                    <MuiIconButton
                      size="small"
                      title={contact.isPrimary ? 'Primary contact' : 'Set as primary'}
                      onClick={() => {
                        if (!contact.isPrimary) void handleSetPrimary(contact.id)
                      }}
                      sx={{ color: contact.isPrimary ? 'warning.main' : 'text.secondary', '&:hover': { color: 'warning.main' } }}
                    >
                      {contact.isPrimary ? <Star sx={{ fontSize: 15 }} /> : <StarBorder sx={{ fontSize: 15 }} />}
                    </MuiIconButton>
                    <MuiIconButton size="small" title="Delete contact"
                      onClick={() => { void handleDeleteContact(contact) }}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                    >
                      <Delete sx={{ fontSize: 17 }} />
                    </MuiIconButton>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    )
  }

  // ── renderProjects ─────────────────────────────────────────────────────────

  function renderProjects() {
    if (linkedProjectsLoading) {
      return (
        <WorkspaceSection title="Linked Projects">
          <Stack gap={1}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        </WorkspaceSection>
      )
    }

    if (linkedProjects.length === 0) {
      return (
        <WorkspaceSection title="Linked Projects">
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <FolderOpen sx={{ fontSize: 36, color: tokens.color.neutral[300], mb: 1 }} />
            <Typography variant="body2" fontWeight={500}>No linked projects</Typography>
            <Typography variant="caption" color="text.secondary">
              Projects where this vendor is mapped to services will appear here
            </Typography>
          </Box>
        </WorkspaceSection>
      )
    }

    return (
      <WorkspaceSection title={`Linked Projects (${linkedProjects.length})`}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Project Name</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Status</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Services</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {linkedProjects.map((project) => (
              <TableRow key={project.id}>
                <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{project.projectName}</TableCell>
                <TableCell>
                  <StatusBadge status={project.status.toLowerCase() === 'live' ? 'active' : 'draft'} />
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {project.services.length
                    ? project.services.map((service) => service.name).join(', ')
                    : '—'}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>₹{formatInr(project.value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </WorkspaceSection>
    )
  }

  // ── renderActivity ─────────────────────────────────────────────────────────

  function renderActivity() {
    return (
      <Box>
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 2.5 }}>
          {ACTIVITY_FILTER_OPTIONS.map((opt) => {
            const selected = activityFilter === opt.id
            return (
              <MuiChip
                key={opt.id}
                label={opt.label}
                size="small"
                onClick={() => setActivityFilter(opt.id)}
                variant={selected ? 'filled' : 'outlined'}
                color={selected ? 'primary' : 'default'}
                sx={{
                  height: 26,
                  fontSize: theme.typography.caption.fontSize,
                  fontWeight: selected ? 600 : 500,
                  ...(selected
                    ? {}
                    : {
                        bgcolor: 'transparent',
                        borderColor: 'divider',
                      }),
                }}
              />
            )
          })}
        </Stack>

        {activityLoading ? (
          <Stack gap={1.5}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        ) : activityItems.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <History size={40} strokeWidth={1.25} color={tokens.color.neutral[300]} style={{ margin: '0 auto 12px' }} />
            <Typography variant="body2" fontWeight={500}>
              No activity yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {activityFilter === 'all'
                ? 'Actions will appear here as the record is updated.'
                : 'No activity matches this filter.'}
            </Typography>
          </Box>
        ) : (
          <Stack gap={0}>
            {activityItems.map((entry, i) => {
              const { Icon, bg, iconColor } = getActivityTimelineVisual(entry.type, theme)
              const isLast = i === activityItems.length - 1
              return (
                <Box
                  key={entry.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: theme.spacing(1.5),
                    py: theme.spacing(1.25),
                    px: 0,
                    borderBottom: isLast ? 'none' : '0.5px solid',
                    borderColor: 'divider',
                    bgcolor: 'transparent',
                    transition: 'background-color 0.15s ease',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: tokens.borderRadius.sm,
                      flexShrink: 0,
                      bgcolor: bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={14} strokeWidth={1.75} color={iconColor} />
                  </Box>
                  <Box sx={{ flex: 1, pt: theme.spacing(0.25) }}>
                    <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.4 }}>
                      {entry.description}
                    </Typography>
                    <Typography
                      component="div"
                      sx={{
                        mt: theme.spacing(0.25),
                        fontSize: theme.typography.caption.fontSize,
                        color: 'text.secondary',
                        whiteSpace: 'normal',
                        overflow: 'visible',
                        display: 'block',
                      }}
                    >
                      {entry.user} · {formatActivityTimestamp(entry.timestamp)}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Stack>
        )}
      </Box>
    )
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'overview': return renderOverview()
      case 'contacts': return renderContacts()
      case 'documents-compliance': return renderDocumentsCompliance()
      case 'projects': return renderProjects()
      case 'activity': return renderActivity()
      default: return null
    }
  }

  return (
    <>
      <WorkspaceDetail
        moduleName="Vendors"
        moduleHref="/vendors"
        recordName={vendor.name}
        avatarText={getInitials(vendor.name)}
        avatarColor={getAvatarColor(vendor.name).bg}
        title={vendor.name}
        primaryAction={{
          label: 'Edit Vendor',
          onClick: () => setDrawerOpen(true),
          icon: <Edit sx={{ fontSize: 14 }} />,
        }}
        secondaryActions={[
          {
            label: 'Edit Rating',
            onClick: handleEditRating,
          },
          {
            label: vendor.status === 'Active' ? 'Deactivate Vendor' : 'Activate Vendor',
            onClick: handleToggleStatus,
            destructive: vendor.status === 'Active',
          },
        ]}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(v) => setActiveTab(v as (typeof VENDOR_DETAIL_TAB_VALUES)[number])}
      >
        {renderTabContent()}
      </WorkspaceDetail>

      <VendorDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode="edit"
        vendor={vendor}
      />

      <ContactDrawer
        open={contactDrawerOpen}
        onClose={() => { setContactDrawerOpen(false); setEditingContact(null) }}
        mode={editingContact ? 'edit' : 'add'}
        contact={editingContact}
        onSave={(data) => { void handleSaveContact(data) }}
      />

      <ComplianceDocumentsUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        saving={saving}
        onSubmit={handleComplianceUpload}
      />

      <EditVendorRatingModal
        open={ratingModalOpen}
        onClose={() => setRatingModalOpen(false)}
        vendorName={vendor.name}
        currentRating={vendor.rating ?? null}
        saving={saving}
        onSave={handleRatingSave}
      />

    </>
  )
}
