import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Divider,
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
  Link,
  TextField,
  MenuItem,
} from '@mui/material'
import {
  VerifiedUser,
  LocationOn,
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
import { ChevronRight, History, Plus } from 'lucide-react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchVendorById, updateVendor } from '../../slices/vendors/thunk'
import { clearSelected } from '../../slices/vendors/reducer'
import type {
  Vendor,
} from '../../slices/vendors/reducer'
import type { Contact } from '../../slices/customers/reducer'
import { WorkspaceDetail, WorkspaceSection } from '../../components/templates'
import { VendorDrawer } from './VendorDrawer'
import { ContactDrawer } from '../../components/ContactDrawer'
import { StatusBadge, useToast, Button } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import {
  getInitials,
  getAvatarColor,
} from '../../utils/formatters'
import {
  normalizeContacts,
  legacyContactsFromVendor,
  getPrimaryContact as getVendorListingPrimaryContact,
  primaryFieldsFromVendor,
} from '../../utils/vendorContacts'
import {
  getVendorComplianceChips,
  getVendorListingCompliance,
} from '../../utils/vendorCompliance'
import { tokens } from '@/design-system/tokens'
import { useTheme, alpha } from '@mui/material/styles'
import {
  getRecordDetailFlatSectionSx,
  getRecordDetailOverviewRightCardSx,
  RecordDetailSectionTitle,
  formatFullAddress,
  getRecordTagChipColors,
  gstStatusHeaderPillSx,
  type ActivityFilterCategory,
  filterActivityLog,
  getActivityTimelineVisual,
  formatActivityTimestamp,
  RecordDetailTaxDocCard,
} from '../workspace/recordDetailTabUtils'

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
          mb: theme.spacing(0.25),
        }}
      >
        {label}
      </Typography>
      <Box sx={{ mt: theme.spacing(0.25) }}>{children}</Box>
    </Box>
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

function getTotalVendorProjects(vendor: Vendor): number {
  const fd = vendor.financialDetails
  if (fd) return fd.activeProjects + fd.completedProjects
  return vendor.activeProjects
}

function vendorWebsiteHref(raw: string | null | undefined): string | null {
  const t = raw?.trim()
  if (!t) return null
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

function vendorWebsiteHost(raw: string | null | undefined): string | null {
  const href = vendorWebsiteHref(raw)
  if (!href) return null
  try {
    return new URL(href).hostname
  } catch {
    return raw!.replace(/^https?:\/\//i, '').replace(/\/$/, '') || null
  }
}

// ── VendorDetailPage ──────────────────────────────────────────────────────────

export default function VendorDetailPage() {
  const { id: slug } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const dispatch = useAppDispatch()
  const vendor = useAppSelector((s) => s.vendors.selectedItem)
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

  async function handleToggleStatus() {
    if (!vendor) return
    const newStatus = vendor.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await dispatch(updateVendor({ id: vendor.id, data: { status: newStatus } })).unwrap()
      showToast({ title: `Vendor ${newStatus === 'Inactive' ? 'deactivated' : 'activated'}`, variant: 'success' })
    } catch {
      showToast({ title: 'Failed to update status', variant: 'error' })
    }
  }

  function openTaxDocument(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function primaryContact(): Contact | undefined {
    if (!vendor) return undefined
    return getVendorListingPrimaryContact({ ...vendor, contacts })
  }

  async function persistContacts(nextContacts: Contact[]) {
    if (!vendor) return
    const normalized = normalizeContacts(nextContacts)
    const primary = getVendorListingPrimaryContact({ ...vendor, contacts: normalized })
    try {
      await dispatch(
        updateVendor({
          id: vendor.id,
          data: {
            contacts: normalized,
            ...primaryFieldsFromVendor(primary),
          },
        }),
      ).unwrap()
      setContacts(normalized)
    } catch {
      showToast({ title: 'Failed to save contacts', variant: 'error' })
    }
  }

  async function handleSaveContact(data: Omit<Contact, 'id'> & { id?: string }) {
    let next: Contact[]
    if (data.id) {
      next = contacts.map((c) => {
        if (c.id === data.id) {
          return { ...c, ...data, id: c.id, isPrimary: data.isPrimary ?? c.isPrimary }
        }
        return data.isPrimary ? { ...c, isPrimary: false } : c
      })
      if (data.isPrimary) {
        next = next.map((c) => ({ ...c, isPrimary: c.id === data.id }))
      }
      showToast({ title: 'Contact updated', variant: 'success' })
    } else {
      const newId = `vc-local-${Date.now()}`
      const isFirst = contacts.length === 0
      const makePrimary = Boolean(data.isPrimary) || isFirst
      let list = makePrimary ? contacts.map((c) => ({ ...c, isPrimary: false })) : [...contacts]
      list.push({ ...data, id: newId, isPrimary: makePrimary })
      next = list
      showToast({ title: 'Contact added', variant: 'success' })
    }
    setContactDrawerOpen(false)
    setEditingContact(null)
    await persistContacts(next)
  }

  async function handleSetPrimary(contactId: string) {
    const next = contacts.map((c) => ({ ...c, isPrimary: c.id === contactId }))
    await persistContacts(next)
    showToast({ title: 'Primary contact updated', variant: 'success' })
  }

  async function handleDeleteContact(contact: Contact) {
    let next = contacts.filter((c) => c.id !== contact.id)
    if (next.length > 0) {
      next = normalizeContacts(next)
    }
    await persistContacts(next)
    showToast({ title: 'Contact removed', variant: 'success' })
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
    const primary = primaryContact()
    const gstRegistered = vendor!.gstStatus === 'Registered'
    const gstPill = gstStatusHeaderPillSx(gstRegistered, theme)
    const mono =
      (theme.typography as { fontFamilyMonospace?: string }).fontFamilyMonospace ?? `'Courier New', monospace`
    const addressStr = formatFullAddress(
      vendor!.address,
      vendor!.city,
      vendor!.state,
      vendor!.pincode,
    ).trim()
    const projTotal = getTotalVendorProjects(vendor!)
    const siteHref = vendorWebsiteHref(vendor!.website)
    const siteHost = vendorWebsiteHost(vendor!.website)
    const complianceSnap = getVendorComplianceChips(vendor!)
    const overallCompliance = getVendorListingCompliance(vendor!)

    return (
      <Box
        sx={{
          display: 'grid',
          gap: theme.spacing(2),
          gridTemplateColumns: { xs: '1fr', md: '1fr 320px' },
          alignItems: 'start',
        }}
      >
        <Stack gap={0}>
          <Box sx={getRecordDetailFlatSectionSx(theme, { isLast: false })}>
            <RecordDetailSectionTitle>Vendor profile</RecordDetailSectionTitle>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing(2) }}>
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
              <LabelValue label="Vendor type">
                <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, fontSize: theme.typography.body2.fontSize }}>
                  {vendor!.financialDetails?.vendorType ?? '—'}
                </Typography>
              </LabelValue>
            </Box>
          </Box>

          <Box sx={getRecordDetailFlatSectionSx(theme, { isLast: false })}>
            <RecordDetailSectionTitle>Address & location</RecordDetailSectionTitle>
            {addressStr ? (
              <Typography
                variant="body2"
                sx={{ color: 'text.primary', fontWeight: 500, fontSize: theme.typography.body2.fontSize, whiteSpace: 'pre-line' }}
              >
                {addressStr}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.disabled">
                No address added
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

        <Box sx={getRecordDetailOverviewRightCardSx(theme)}>
          <RecordDetailSectionTitle>Primary contact</RecordDetailSectionTitle>
          {primary ? (
            <Stack direction="row" alignItems="flex-start" gap={theme.spacing(2)}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  flexShrink: 0,
                  bgcolor: getAvatarColor(primary.name).bg,
                  color: getAvatarColor(primary.name).text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {getInitials(primary.name)}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={500}>
                  {primary.name}
                </Typography>
                {primary.designation ? (
                  <Typography variant="body2" color="text.secondary">
                    {primary.designation}
                  </Typography>
                ) : null}
                <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 1 }}>
                  <Phone sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {primary.phone}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <Email sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Link href={`mailto:${primary.email}`} variant="body2" sx={{ fontSize: 12, color: 'primary.main' }}>
                    {primary.email}
                  </Link>
                </Stack>
              </Box>
            </Stack>
          ) : (
            <Box sx={{ py: 2, textAlign: 'center' }}>
              <Person sx={{ fontSize: 28, color: tokens.color.neutral[300], mb: 1 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                No contact added yet
              </Typography>
              <Button
                variant="outlined"
                color="secondary"
                size="sm"
                startIcon={<Plus size={14} strokeWidth={2} />}
                onClick={() => {
                  setEditingContact(null)
                  setContactDrawerOpen(true)
                }}
              >
                Add contact
              </Button>
            </Box>
          )}

          <Divider sx={{ my: theme.spacing(1.5) }} />

          <RecordDetailSectionTitle>Procurement summary</RecordDetailSectionTitle>
          <Stack gap={theme.spacing(1)}>
            <LabelValue label="Website">
              {siteHref && siteHost ? (
                <Link href={siteHref} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ fontSize: 12 }}>
                  {siteHost}
                </Link>
              ) : (
                <Typography variant="body2" color="text.disabled" sx={{ fontSize: 12 }}>
                  —
                </Typography>
              )}
            </LabelValue>
            <LabelValue label="Linked projects">
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>
                {projTotal} Project{projTotal === 1 ? '' : 's'}
              </Typography>
            </LabelValue>
            <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 0.5, mb: 0.5 }}>
              <Typography component="span" sx={{ fontSize: 14 }}>
                {overallCompliance.emoji}
              </Typography>
              <StatusBadge
                status={overallCompliance.statusBadgeType}
                label={overallCompliance.label}
              />
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
              {complianceSnap.map((c) => {
                const sx =
                  c.tone === 'verified'
                    ? { bgcolor: alpha(tokens.color.primary[500], 0.08), color: tokens.color.primary[700] }
                    : c.tone === 'warning'
                      ? { bgcolor: alpha(theme.palette.warning.main, 0.12), color: theme.palette.warning.dark }
                      : { bgcolor: tokens.color.neutral[100], color: 'text.disabled' }
                return (
                  <MuiChip
                    key={c.label}
                    label={c.label}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 9,
                      fontWeight: 600,
                      '& .MuiChip-label': { px: '5px' },
                      ...sx,
                    }}
                  />
                )
              })}
            </Stack>
          </Stack>

          <Divider sx={{ my: theme.spacing(1.5) }} />

          <RecordDetailSectionTitle>Quick actions</RecordDetailSectionTitle>
          <Stack gap={0.25} alignItems="flex-start">
            <Button
              variant="text"
              color="primary"
              size="sm"
              endIcon={<ChevronRight size={16} />}
              onClick={() => setActiveTab('projects')}
            >
              View Linked Projects
            </Button>
          </Stack>
        </Box>
      </Box>
    )
  }

  // ── renderDocumentsCompliance ───────────────────────────────────────────────

  function renderDocumentsCompliance() {
    const onCopy = () => showToast({ title: 'Copied to clipboard', variant: 'success' })
    const insExpiry = vendor!.compliance?.insurance?.expiryDate

    function fmtTs(iso: string) {
      try {
        return new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
        }).format(new Date(iso))
      } catch {
        return iso
      }
    }

    return (
      <Stack gap={theme.spacing(2)}>
        <WorkspaceSection title="Compliance registration">
          <Box
            sx={{
              display: 'grid',
              gap: theme.spacing(1.5),
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              alignItems: 'start',
            }}
          >
            <RecordDetailTaxDocCard
              variant="gst"
              title="GST Registration"
              statusChip={{
                label: vendor!.gstStatus,
                isRegistered: vendor!.gstStatus === 'Registered',
              }}
              fieldLabel="GSTIN"
              fieldValue={vendor!.gstin}
              document={vendor!.gstDocument ?? null}
              emptyDocMessage="No certificate uploaded"
              uploadButtonLabel="+ Upload Certificate"
              onView={openTaxDocument}
              onDownload={openTaxDocument}
              onCopySuccess={onCopy}
            />
            <RecordDetailTaxDocCard
              variant="pan"
              title="PAN / Income Tax"
              fieldLabel="PAN"
              fieldValue={vendor!.pan}
              document={vendor!.panDocument ?? null}
              emptyDocMessage="No document uploaded"
              uploadButtonLabel="+ Upload Document"
              onView={openTaxDocument}
              onDownload={openTaxDocument}
              onCopySuccess={onCopy}
            />
            <RecordDetailTaxDocCard
              variant="cheque"
              title="Bank Cancelled Cheque"
              fieldLabel="Verification document"
              fieldValue="—"
              document={vendor!.bankChequeDocument ?? null}
              emptyDocMessage="No cancelled cheque uploaded"
              uploadButtonLabel="+ Upload cheque"
              onView={openTaxDocument}
              onDownload={openTaxDocument}
              onCopySuccess={onCopy}
            />
            <Box>
              <RecordDetailTaxDocCard
                variant="insurance"
                title="Insurance"
                fieldLabel={insExpiry ? 'Policy expiry' : 'Coverage'}
                fieldValue={insExpiry ? fmtTs(insExpiry) : 'General liability'}
                document={vendor!.insuranceDocument ?? null}
                emptyDocMessage="No insurance document uploaded"
                uploadButtonLabel="+ Upload certificate"
                onView={openTaxDocument}
                onDownload={openTaxDocument}
                onCopySuccess={onCopy}
              />
            </Box>
          </Box>
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
          <Stack gap={1.5}>
            {contacts.map((contact) => (
              <Box
                key={contact.id}
                sx={{
                  p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                  bgcolor: contact.isPrimary ? alpha(theme.palette.primary.main, 0.03) : 'background.paper',
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
                    {contact.isPrimary ? (
                      <Typography variant="caption" color="primary" fontWeight={700} sx={{ display: 'block', mb: 0.25 }}>
                        Primary Contact
                      </Typography>
                    ) : null}
                    <Typography variant="body2" fontWeight={600}>{contact.name}</Typography>
                    {contact.designation && (
                      <Typography variant="caption" color="text.secondary">{contact.designation}</Typography>
                    )}
                    <Stack gap={0.25} sx={{ mt: 0.75 }}>
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
                      onClick={() => { void handleSetPrimary(contact.id) }}
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
          </Stack>
        )}
      </Box>
    )
  }

  // ── renderProjects ─────────────────────────────────────────────────────────

  function renderProjects() {
    const totalProj = getTotalVendorProjects(vendor!)

    if (totalProj === 0) {
      return (
        <WorkspaceSection title="Linked Projects">
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <FolderOpen sx={{ fontSize: 36, color: tokens.color.neutral[300], mb: 1 }} />
            <Typography variant="body2" fontWeight={500}>No linked projects</Typography>
            <Typography variant="caption" color="text.secondary">Projects linked to this vendor will appear here</Typography>
          </Box>
        </WorkspaceSection>
      )
    }
    return (
      <WorkspaceSection title={`Linked Projects (${totalProj})`}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Project Name</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Status</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Value</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Role</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(totalProj)].map((_, i) => (
              <TableRow key={i}>
                <TableCell sx={{ fontSize: 12 }}>Project {i + 1}</TableCell>
                <TableCell><StatusBadge status="active" /></TableCell>
                <TableCell sx={{ fontSize: 12 }}>-</TableCell>
                <TableCell sx={{ fontSize: 12 }}>-</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </WorkspaceSection>
    )
  }

  // ── renderActivity ─────────────────────────────────────────────────────────

  function renderActivity() {
    const log = vendor!.activityLog ?? []
    const filtered = filterActivityLog(log, activityFilter)

    if (log.length === 0) {
      return (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <History size={40} strokeWidth={1.25} color={tokens.color.neutral[300]} style={{ margin: '0 auto 12px' }} />
          <Typography variant="body2" fontWeight={500}>
            No activity yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Actions will appear here as the record is updated.
          </Typography>
        </Box>
      )
    }

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
                }}
              />
            )
          })}
        </Stack>

        {filtered.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No activity matches this filter.
            </Typography>
          </Box>
        ) : (
          <Stack gap={0}>
            {filtered.map((entry, i) => {
              const { Icon, bg, iconColor } = getActivityTimelineVisual(entry.type, theme)
              const isLast = i === filtered.length - 1
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

  const headerPrimary =
    getVendorListingPrimaryContact({ ...vendor, contacts })?.name ?? vendor.contactPerson

  return (
    <>
      <WorkspaceDetail
        moduleName="Vendors"
        moduleHref="/vendors"
        recordName={vendor.name}
        avatarText={getInitials(vendor.name)}
        avatarColor={getAvatarColor(vendor.name).bg}
        title={vendor.name}
        titleMeta={<StatusBadge status={vendor.status.toLowerCase() as StatusType} />}
        metaItems={[
          { icon: <Person sx={{ fontSize: 12 }} />, label: headerPrimary },
          { icon: <VerifiedUser sx={{ fontSize: 12 }} />, label: `GST: ${vendor.gstStatus}` },
          { icon: <LocationOn sx={{ fontSize: 12 }} />, label: `${vendor.city}, ${vendor.state}` },
        ]}
        primaryAction={{
          label: 'Edit Vendor',
          onClick: () => setDrawerOpen(true),
          icon: <Edit sx={{ fontSize: 14 }} />,
        }}
        secondaryActions={[
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

    </>
  )
}
