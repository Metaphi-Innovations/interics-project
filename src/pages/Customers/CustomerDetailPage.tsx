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
  Grid,
} from '@mui/material'
import {
  Business,
  VerifiedUser,
  LocationOn,
  Edit,
  Phone,
  Email,
  Receipt,
  FolderOpen,
  Add,
  Delete,
  Star,
  StarBorder,
  Person,
} from '@mui/icons-material'
import { History } from 'lucide-react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchCustomerById, updateCustomer } from '../../slices/customers/thunk'
import { clearSelected } from '../../slices/customers/reducer'
import type { Contact } from '../../slices/customers/reducer'
import { WorkspaceDetail, WorkspaceSection } from '../../components/templates'
import { CustomerDrawer } from './CustomerDrawer'
import { ContactDrawer } from '../../components/ContactDrawer'
import { StatusBadge, useToast, Button } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import {
  getInitials,
  getAvatarColor,
  formatCurrency,
} from '../../utils/formatters'
import {
  getPrimaryContact,
  legacyContactsFromCustomer,
  normalizeContacts,
  primaryFieldsFromContact,
} from '../../utils/customerContacts'
import { tokens } from '@/design-system/tokens'
import { useTheme, alpha } from '@mui/material/styles'
import {
  getRecordDetailFlatSectionSx,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      <Typography variant="h6" fontWeight={600}>Customer not found</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        The customer you're looking for doesn't exist or has been removed.
      </Typography>
      <Box
        component="span"
        onClick={() => navigate('/customers')}
        sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}
      >
        ← Back to Customers
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

// ─── CustomerDetailPage ───────────────────────────────────────────────────────

const CUSTOMER_DETAIL_TABS = ['overview', 'contacts', 'projects', 'billing', 'financial', 'activity'] as const

export default function CustomerDetailPage() {
  const { id: slug } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const dispatch = useAppDispatch()
  const customer = useAppSelector((s) => s.customers.selectedItem)
  const { showToast } = useToast()
  const theme = useTheme()

  const [activeTab, setActiveTab] = useState('overview')
  const [localLoading, setLocalLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Contacts state (local, seeded from customer data)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [activityFilter, setActivityFilter] = useState<ActivityFilterCategory>('all')

  useEffect(() => {
    if (!slug) return
    dispatch(clearSelected())
    setLocalLoading(true)
    setNotFound(false)
    dispatch(fetchCustomerById(slug))
      .unwrap()
      .then(() => setLocalLoading(false))
      .catch(() => {
        setNotFound(true)
        setLocalLoading(false)
      })
  }, [slug, dispatch])

  useEffect(() => {
    if (!customer) return
    const seed = customer.contacts?.length
      ? customer.contacts
      : legacyContactsFromCustomer(customer)
    setContacts(normalizeContacts(seed))
  }, [customer])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'docs-tax') {
      setActiveTab('overview')
      return
    }
    if (tab && (CUSTOMER_DETAIL_TABS as readonly string[]).includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  async function handleToggleStatus() {
    if (!customer) return
    const newStatus = customer.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await dispatch(updateCustomer({ id: customer.id, data: { status: newStatus } })).unwrap()
      showToast({ title: `Customer ${newStatus === 'Inactive' ? 'deactivated' : 'activated'}`, variant: 'success' })
    } catch {
      showToast({ title: 'Failed to update status', variant: 'error' })
    }
  }

  function openTaxDocument(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // ── Contact actions ─────────────────────────────────────────────────────────

  async function persistContacts(nextContacts: Contact[]) {
    if (!customer) return
    const normalized = normalizeContacts(nextContacts)
    const primary = getPrimaryContact({ ...customer, contacts: normalized })
    try {
      await dispatch(
        updateCustomer({
          id: customer.id,
          data: {
            contacts: normalized,
            ...primaryFieldsFromContact(primary),
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
      const newId = `cc-local-${Date.now()}`
      const isFirst = contacts.length === 0
      const makePrimary = data.isPrimary || isFirst
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
  if (notFound || !customer) return <NotFound />

  const tabs = [
    { label: 'Overview', value: 'overview' },
    { label: 'Contacts', value: 'contacts' },
    { label: 'Linked Projects', value: 'projects' },
    { label: 'Billing History', value: 'billing' },
    { label: 'Financial Details', value: 'financial' },
    { label: 'Activity', value: 'activity' },
  ]

  function renderDocumentsAndTax() {
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
            label: customer!.gstStatus,
            isRegistered: customer!.gstStatus === 'Registered',
          }}
          fieldLabel="GSTIN"
          fieldValue={customer!.gstin}
          document={customer!.gstDocument ?? null}
          emptyDocMessage="No document uploaded"
          onView={openTaxDocument}
          onDownload={openTaxDocument}
          onCopySuccess={onCopy}
        />
        <RecordDetailTaxDocCard
          variant="pan"
          title="PAN / Income Tax"
          fieldLabel="PAN Number"
          fieldValue={customer!.pan}
          document={customer!.panDocument ?? null}
          emptyDocMessage="No document uploaded"
          onView={openTaxDocument}
          onDownload={openTaxDocument}
          onCopySuccess={onCopy}
        />
      </Box>
    )
  }

  // ── renderOverview ─────────────────────────────────────────────────────────

  function renderOverview() {
    const gstRegistered = customer!.gstStatus === 'Registered'
    const gstPill = gstStatusHeaderPillSx(gstRegistered, theme)
    const mono =
      (theme.typography as { fontFamilyMonospace?: string }).fontFamilyMonospace ?? `'Courier New', monospace`
    const addressStr = formatFullAddress(
      customer!.address,
      customer!.city,
      customer!.state,
      customer!.pincode,
    ).trim()

    return (
      <Stack gap={0}>
        <Box sx={getRecordDetailFlatSectionSx(theme, { isLast: false })}>
          <RecordDetailSectionTitle>Customer profile</RecordDetailSectionTitle>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: theme.spacing(2),
            }}
          >
            <LabelValue label="Customer name">
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, fontSize: theme.typography.body2.fontSize }}>
                {customer!.name}
              </Typography>
            </LabelValue>
            <LabelValue label="Customer type">
              <MuiChip
                label={customer!.type}
                size="small"
                variant="filled"
                sx={{
                  height: 22,
                  fontWeight: 600,
                  fontSize: theme.typography.caption.fontSize,
                  borderRadius: tokens.borderRadius.lg,
                  border: 'none',
                }}
              />
            </LabelValue>
            <LabelValue label="Status">
              <StatusBadge status={customer!.status.toLowerCase() as StatusType} />
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
                {customer!.gstStatus}
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
                {customer!.gstin ?? '—'}
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
                {customer!.pan ?? '—'}
              </Typography>
            </LabelValue>
            <LabelValue label="City">
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, fontSize: theme.typography.body2.fontSize }}>
                {customer!.city || '—'}
              </Typography>
            </LabelValue>
            <LabelValue label="State">
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, fontSize: theme.typography.body2.fontSize }}>
                {customer!.state || '—'}
              </Typography>
            </LabelValue>
            <LabelValue label="Pincode">
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, fontSize: theme.typography.body2.fontSize }}>
                {customer!.pincode ?? '—'}
              </Typography>
            </LabelValue>
          </Box>
        </Box>

        <Box sx={getRecordDetailFlatSectionSx(theme, { isLast: false })}>
          <RecordDetailSectionTitle>Documents & Tax</RecordDetailSectionTitle>
          {renderDocumentsAndTax()}
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
          <RecordDetailSectionTitle>Tags & notes</RecordDetailSectionTitle>
          {customer!.tags.length > 0 ? (
            <Stack direction="row" flexWrap="wrap" gap={theme.spacing(0.75)}>
              {customer!.tags.map((tag) => {
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
              No tags added
            </Typography>
          )}
          {customer!.notes ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: theme.spacing(1.5) }}>
              {customer!.notes}
            </Typography>
          ) : null}
        </Box>
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
                Add contacts to keep track of key people for this customer
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
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="body2" fontWeight={600}>{contact.name}</Typography>
                      {contact.isPrimary ? (
                        <Typography
                          variant="caption"
                          sx={{ fontSize: 10, fontWeight: 600, color: 'primary.main', letterSpacing: 0.3 }}
                        >
                          Primary Contact
                        </Typography>
                      ) : null}
                    </Stack>
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
                    <MuiIconButton
                      size="small"
                      title="Edit contact"
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
                      sx={{
                        color: contact.isPrimary ? 'warning.main' : 'text.secondary',
                        '&:hover': { color: 'warning.main' },
                      }}
                    >
                      {contact.isPrimary ? (
                        <Star sx={{ fontSize: 15 }} />
                      ) : (
                        <StarBorder sx={{ fontSize: 15 }} />
                      )}
                    </MuiIconButton>
                    <MuiIconButton
                      size="small"
                      title="Delete contact"
                      onClick={() => { void handleDeleteContact(contact) }}
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
    if (customer!.activeProjects === 0) {
      return (
        <WorkspaceSection title="Linked Projects">
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <FolderOpen sx={{ fontSize: 36, color: tokens.color.neutral[300], mb: 1 }} />
            <Typography variant="body2" fontWeight={500}>No linked projects</Typography>
            <Typography variant="caption" color="text.secondary">
              Projects linked to this customer will appear here
            </Typography>
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
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Manager</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(customer!.activeProjects)].map((_, i) => (
              <TableRow key={i}>
                <TableCell sx={{ fontSize: 12 }}>Project {i + 1}</TableCell>
                <TableCell><StatusBadge status="active" /></TableCell>
                <TableCell sx={{ fontSize: 12 }}>—</TableCell>
                <TableCell sx={{ fontSize: 12 }}>—</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </WorkspaceSection>
    )
  }

  // ── renderFinancial ────────────────────────────────────────────────────────

  function renderFinancial() {
    const fd = customer!.financialDetails
    if (!fd) {
      return (
        <WorkspaceSection>
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Financial details not available</Typography>
          </Box>
        </WorkspaceSection>
      )
    }

    const fmt = (n: number) => `₹${formatCurrency(n)}`

    return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SummaryCard
            title="Billing Summary"
            rows={[
              { label: 'Total Billed', value: fmt(fd.totalBilled) },
              { label: 'Amount Received', value: fmt(fd.amountReceived) },
              { label: 'Outstanding', value: <Box sx={{ color: fd.outstanding > 0 ? 'error.main' : 'success.main' }}>{fmt(fd.outstanding)}</Box> },
              { label: 'TDS Withheld', value: fmt(fd.tdsWithheld) },
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SummaryCard
            title="Project Summary"
            rows={[
              { label: 'Active Projects', value: fd.activeProjects },
              { label: 'Completed Projects', value: fd.completedProjects },
              { label: 'Total Project Value', value: fmt(fd.totalProjectValue) },
              { label: 'Last Invoice Date', value: fd.lastInvoiceDate },
            ]}
          />
        </Grid>
      </Grid>
    )
  }

  // ── renderActivity ─────────────────────────────────────────────────────────

  function renderActivity() {
    const log = customer!.activityLog ?? []
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

  // ── renderBilling placeholder ──────────────────────────────────────────────

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
      case 'overview':   return renderOverview()
      case 'contacts':   return renderContacts()
      case 'projects':   return renderProjects()
      case 'billing':    return renderPlaceholder(<Receipt sx={{ fontSize: 36 }} />, 'Billing history will appear here once invoices are created')
      case 'financial':  return renderFinancial()
      case 'activity':   return renderActivity()
      default:           return null
    }
  }

  return (
    <>
      <WorkspaceDetail
        moduleName="Customers"
        moduleHref="/customers"
        recordName={customer.name}
        avatarText={getInitials(customer.name)}
        avatarColor={getAvatarColor(customer.name).bg}
        title={customer.name}
        titleMeta={<StatusBadge status={customer.status.toLowerCase() as StatusType} />}
        metaItems={[
          { icon: <Business sx={{ fontSize: 12 }} />, label: customer.type },
          { icon: <VerifiedUser sx={{ fontSize: 12 }} />, label: `GST: ${customer.gstStatus}` },
          { icon: <LocationOn sx={{ fontSize: 12 }} />, label: `${customer.city}, ${customer.state}` },
        ]}
        primaryAction={{
          label: 'Edit Customer',
          onClick: () => setDrawerOpen(true),
          icon: <Edit sx={{ fontSize: 14 }} />,
        }}
        secondaryActions={[
          {
            label: customer.status === 'Active' ? 'Deactivate Customer' : 'Activate Customer',
            onClick: handleToggleStatus,
            destructive: customer.status === 'Active',
          },
        ]}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {renderTabContent()}
      </WorkspaceDetail>

      {/* Edit details drawer */}
      <CustomerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode="edit"
        customer={customer}
      />

      {/* Add/Edit contact drawer */}
      <ContactDrawer
        open={contactDrawerOpen}
        onClose={() => { setContactDrawerOpen(false); setEditingContact(null) }}
        mode={editingContact ? 'edit' : 'add'}
        contact={editingContact}
        onSave={handleSaveContact}
      />

    </>
  )
}
