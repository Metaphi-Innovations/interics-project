import { useState, useEffect } from 'react'
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Link,
} from '@mui/material'
import {
  VerifiedUser,
  LocationOn,
  Edit,
  Phone,
  Email,
  Payment,
  FolderOpen,
  Add,
  Delete,
  StarBorder,
  Person,
} from '@mui/icons-material'
import { ChevronRight, History, Plus } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchVendorById, updateVendor } from '../../slices/vendors/thunk'
import { clearSelected } from '../../slices/vendors/reducer'
import type { Contact } from '../../slices/customers/reducer'
import { WorkspaceDetail, WorkspaceSection } from '../../components/templates'
import { VendorDrawer } from './VendorDrawer'
import { ContactDrawer } from '../../components/ContactDrawer'
import { StatusBadge, useToast, Button } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import {
  getInitials,
  getAvatarColor,
  formatCurrency,
} from '../../utils/formatters'
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

function SummaryCard({ title, rows }: { title: string; rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <WorkspaceSection title={title}>
      <Stack gap={1.5}>
        {rows.map((row, i) => (
          <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">{row.label}</Typography>
            <Box sx={{ fontWeight: 600, fontSize: 13 }}>{row.value}</Box>
          </Stack>
        ))}
      </Stack>
    </WorkspaceSection>
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

// ── VendorDetailPage ──────────────────────────────────────────────────────────

export default function VendorDetailPage() {
  const { id: slug } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const vendor = useAppSelector((s) => s.vendors.selectedItem)
  const { showToast } = useToast()
  const theme = useTheme()

  const [activeTab, setActiveTab] = useState('overview')
  const [localLoading, setLocalLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deleteConfirmContact, setDeleteConfirmContact] = useState<Contact | null>(null)
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
    if (vendor) {
      setContacts(vendor.contacts ?? [])
    }
  }, [vendor])

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
    return contacts.find((c) => c.isPrimary)
  }

  function handleSaveContact(data: Omit<Contact, 'id'> & { id?: string }) {
    if (data.id) {
      setContacts((prev) =>
        prev.map((c) => {
          if (data.isPrimary) return { ...c, isPrimary: c.id === data.id }
          return c.id === data.id ? { ...c, ...data, id: c.id } : c
        })
      )
      showToast({ title: 'Contact updated', variant: 'success' })
    } else {
      const newId = `vc-local-${Date.now()}`
      setContacts((prev) => {
        let next = [...prev]
        if (data.isPrimary) next = next.map((c) => ({ ...c, isPrimary: false }))
        next.push({ ...data, id: newId })
        return next
      })
      showToast({ title: 'Contact added', variant: 'success' })
    }
    setContactDrawerOpen(false)
    setEditingContact(null)
  }

  function handleSetPrimary(contactId: string) {
    setContacts((prev) => prev.map((c) => ({ ...c, isPrimary: c.id === contactId })))
    showToast({ title: 'Primary contact updated', variant: 'success' })
  }

  function handleDeleteContact(contact: Contact) {
    if (contact.isPrimary) {
      setDeleteConfirmContact(contact)
      return
    }
    setContacts((prev) => prev.filter((c) => c.id !== contact.id))
    showToast({ title: 'Contact removed', variant: 'success' })
  }

  if (localLoading) return <DetailSkeleton />
  if (notFound || !vendor) return <NotFound />

  const tabs = [
    { label: 'Overview', value: 'overview' },
    { label: 'Documents & Tax', value: 'docs-tax' },
    { label: 'Contacts', value: 'contacts' },
    { label: 'Linked Projects', value: 'projects' },
    { label: 'Payment History', value: 'payments' },
    { label: 'Financial Details', value: 'financial' },
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
    const fd = vendor!.financialDetails
    const totalPayables = fd?.totalPayables ?? vendor!.totalPayables ?? 0
    const amountPaid = fd?.amountPaid ?? 0
    const outstanding = fd?.outstanding ?? 0

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

          <RecordDetailSectionTitle>Financial summary</RecordDetailSectionTitle>
          <Stack gap={theme.spacing(1.5)}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Total Payables
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                ₹{formatCurrency(totalPayables)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Paid
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ color: 'success.main' }}>
                ₹{formatCurrency(amountPaid)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Outstanding
              </Typography>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ color: outstanding > 0 ? 'warning.main' : 'text.primary' }}
              >
                ₹{formatCurrency(outstanding)}
              </Typography>
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
              onClick={() => setActiveTab('payments')}
            >
              View Payment History
            </Button>
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

  // ── renderDocsTax ──────────────────────────────────────────────────────────

  function renderDocsTax() {
    const onCopy = () => showToast({ title: 'Copied to clipboard', variant: 'success' })
    return (
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
      </Box>
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
                    {!contact.isPrimary && (
                      <MuiIconButton size="small" title="Set as primary"
                        onClick={() => handleSetPrimary(contact.id)}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'warning.main' } }}
                      >
                        <StarBorder sx={{ fontSize: 15 }} />
                      </MuiIconButton>
                    )}
                    <MuiIconButton size="small" title="Delete contact"
                      onClick={() => handleDeleteContact(contact)}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                    >
                      <Delete sx={{ fontSize: 15 }} />
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
    if (vendor!.activeProjects === 0) {
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
      <WorkspaceSection title="Linked Projects">
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
            {[...Array(vendor!.activeProjects)].map((_, i) => (
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

  // ── renderFinancial ────────────────────────────────────────────────────────

  function renderFinancial() {
    const fd = vendor!.financialDetails
    if (!fd) {
      return (
        <WorkspaceSection>
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Financial details not available</Typography>
          </Box>
        </WorkspaceSection>
      )
    }
    const fmt = (n: number) => `\u20B9${formatCurrency(n)}`
    return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SummaryCard
            title="Payment Summary"
            rows={[
              { label: 'Total Payables', value: fmt(fd.totalPayables) },
              { label: 'Amount Paid', value: fmt(fd.amountPaid) },
              { label: 'Outstanding', value: <Box sx={{ color: fd.outstanding > 0 ? 'error.main' : 'success.main' }}>{fmt(fd.outstanding)}</Box> },
              { label: 'TDS Deducted', value: fmt(fd.tdsDeducted) },
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SummaryCard
            title="Project Summary"
            rows={[
              { label: 'Active Projects', value: fd.activeProjects },
              { label: 'Completed Projects', value: fd.completedProjects },
              { label: 'Total Contract Value', value: fmt(fd.totalContractValue) },
              { label: 'Last Payment Date', value: fd.lastPaymentDate },
            ]}
          />
        </Grid>
      </Grid>
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

  function renderPlaceholder(icon: React.ReactNode, message: string) {
    return (
      <WorkspaceSection>
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Box sx={{ color: tokens.color.neutral[300], mb: 1 }}>{icon}</Box>
          <Typography variant="body2" color="text.secondary">{message}</Typography>
        </Box>
      </WorkspaceSection>
    )
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'overview':  return renderOverview()
      case 'docs-tax':  return renderDocsTax()
      case 'contacts':  return renderContacts()
      case 'projects':  return renderProjects()
      case 'payments':  return renderPlaceholder(<Payment sx={{ fontSize: 36 }} />, 'Payment history will appear here once vendor payments are recorded')
      case 'financial': return renderFinancial()
      case 'activity':  return renderActivity()
      default:          return null
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
        titleMeta={<StatusBadge status={vendor.status.toLowerCase() as StatusType} />}
        metaItems={[
          { icon: <Person sx={{ fontSize: 12 }} />, label: vendor.contactPerson },
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
        onTabChange={setActiveTab}
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
        onSave={handleSaveContact}
      />

      <Dialog open={!!deleteConfirmContact} onClose={() => setDeleteConfirmContact(null)} maxWidth="xs">
        <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Cannot Delete Primary Contact</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            <strong>{deleteConfirmContact?.name}</strong> is the primary contact. Please set another
            contact as primary before deleting this one.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button variant="outlined" color="secondary" size="sm" onClick={() => setDeleteConfirmContact(null)}>OK, got it</Button>
        </DialogActions>
      </Dialog>

    </>
  )
}
