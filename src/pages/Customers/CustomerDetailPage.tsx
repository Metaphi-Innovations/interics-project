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
  Edit,
  Phone,
  Email,
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
import { fetchCustomerById, setCustomerActive, createCustomerContact, updateCustomerContact } from '../../slices/customers/thunk'
import { clearSelected } from '../../slices/customers/reducer'
import type { ActivityEntry, Contact, CustomerFinancialDetails } from '../../slices/customers/reducer'
import { WorkspaceDetail, WorkspaceSection } from '../../components/templates'
import { CustomerDrawer } from './CustomerDrawer'
import { ContactDrawer } from '../../components/ContactDrawer'
import { StatusBadge, useToast, Button, ConfirmDialog } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { PODocumentLinkField } from '@/components/documents/PODocumentLinkField'
import {
  getInitials,
  getAvatarColor,
  formatCurrency,
  formatDate,
} from '../../utils/formatters'
import {
  getCustomerContactsList,
  legacyContactsFromCustomer,
  normalizeContacts,
} from '../../utils/customerContacts'
import { customersService } from '@/modules/customers'
import { projectsService } from '@/modules/projects'
import type { Project } from '@/slices/projects/reducer'
import { toActivityEntry, toFinancialDetails } from '@/modules/customers/customers.activity.mapper'
import { tokens } from '@/design-system/tokens'
import { useTheme, alpha } from '@mui/material/styles'
import {
  getRecordDetailFlatSectionSx,
  RecordDetailSectionTitle,
  type ActivityFilterCategory,
  getActivityTimelineVisual,
  formatActivityTimestamp,
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
          mb: theme.spacing(0.75),
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

const CUSTOMER_DETAIL_TABS = ['overview', 'contacts', 'projects', 'financial', 'activity'] as const

export default function CustomerDetailPage() {
  const { id: slug } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
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
  const [deleteContactTarget, setDeleteContactTarget] = useState<Contact | null>(null)
  const [deletingContact, setDeletingContact] = useState(false)
  const [activityFilter, setActivityFilter] = useState<ActivityFilterCategory>('all')
  const [activityItems, setActivityItems] = useState<ActivityEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [financialDetails, setFinancialDetails] = useState<CustomerFinancialDetails | null>(null)
  const [financialLoading, setFinancialLoading] = useState(false)
  const [linkedProjects, setLinkedProjects] = useState<Project[]>([])
  const [linkedProjectsLoading, setLinkedProjectsLoading] = useState(false)

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

  useEffect(() => {
    if (!customer || activeTab !== 'activity') return
    let cancelled = false
    setActivityLoading(true)
    const type = activityFilter === 'all' ? 'ALL' : activityFilter.toUpperCase()
    void customersService
      .getActivity(customer.id, { type, activityPage: 1, activityLimit: 50 })
      .then((section) => {
        if (cancelled) return
        setActivityItems((section.items ?? []).map(toActivityEntry))
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
  }, [customer, activeTab, activityFilter])

  useEffect(() => {
    if (!customer || activeTab !== 'financial') return
    let cancelled = false
    setFinancialLoading(true)
    void customersService
      .getFinancial(customer.id)
      .then((api) => {
        if (cancelled) return
        setFinancialDetails(toFinancialDetails(api, customer.gstStatus))
      })
      .catch(() => {
        if (cancelled) return
        setFinancialDetails(null)
        showToast({ title: 'Failed to load financial details', variant: 'error' })
      })
      .finally(() => {
        if (!cancelled) setFinancialLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [customer, activeTab])

  useEffect(() => {
    if (!customer || activeTab !== 'projects') return
    let cancelled = false
    setLinkedProjectsLoading(true)
    void projectsService
      .getAll({
        customerId: customer.id,
        limit: 100,
        columns: [
          'id',
          'projectCode',
          'projectName',
          'status',
          'statusLabel',
          'projectLeadName',
          'totalClientPOValue',
        ],
      })
      .then((result) => {
        if (cancelled) return
        setLinkedProjects(result.items)
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
  }, [customer, activeTab])

  async function handleToggleStatus() {
    if (!customer) return
    const nextActive = customer.status !== 'Active'
    try {
      await dispatch(setCustomerActive({ id: customer.id, isActive: nextActive })).unwrap()
      showToast({ title: `Customer ${nextActive ? 'activated' : 'deactivated'}`, variant: 'success' })
      void dispatch(fetchCustomerById(customer.id))
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to update status'
      showToast({ title: message, variant: 'error' })
    }
  }

  // ── Contact actions ─────────────────────────────────────────────────────────

  async function reloadContacts() {
    if (!customer) return
    const full = await dispatch(fetchCustomerById(customer.id)).unwrap()
    setContacts(getCustomerContactsList(full))
  }

  async function handleSaveContact(data: Omit<Contact, 'id'> & { id?: string }) {
    if (!customer) return
    try {
      if (data.id) {
        await dispatch(
          updateCustomerContact({
            customerId: customer.id,
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
          createCustomerContact({
            customerId: customer.id,
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
    if (!customer) return
    try {
      await dispatch(
        updateCustomerContact({
          customerId: customer.id,
          contactId,
          data: { isPrimary: true },
        }),
      ).unwrap()
      await reloadContacts()
      showToast({ title: 'Primary contact updated', variant: 'success' })
    } catch {
      showToast({ title: 'Failed to update primary contact', variant: 'error' })
    }
  }

  async function handleDeleteContact() {
    if (!customer || !deleteContactTarget) return
    setDeletingContact(true)
    try {
      await customersService.removeContact(customer.id, deleteContactTarget.id)
      setDeleteContactTarget(null)
      await reloadContacts()
      showToast({ title: 'Contact removed', variant: 'success' })
    } catch {
      showToast({ title: 'Failed to remove contact', variant: 'error' })
    } finally {
      setDeletingContact(false)
    }
  }

  if (localLoading) return <DetailSkeleton />
  if (notFound || !customer) return <NotFound />

  const tabs = [
    { label: 'Overview', value: 'overview' },
    { label: 'Contacts', value: 'contacts' },
    { label: 'Linked Projects', value: 'projects' },
    { label: 'Financial Details', value: 'financial' },
    { label: 'Activity', value: 'activity' },
  ]

  // ── renderOverview ─────────────────────────────────────────────────────────

  function renderOverview() {
    const gstRegistered = customer!.gstStatus === 'Registered'
    const mono =
      (theme.typography as { fontFamilyMonospace?: string }).fontFamilyMonospace ?? `'Courier New', monospace`
    const street = customer!.address?.trim() || ''
    const cityState = [customer!.city, customer!.state].filter(Boolean).join(', ')

    return (
      <Stack gap={0}>
        <Box
          sx={{
            ...getRecordDetailFlatSectionSx(theme, { isLast: false }),
            mb: theme.spacing(3),
            pb: theme.spacing(3),
          }}
        >
          <RecordDetailSectionTitle>Customer profile</RecordDetailSectionTitle>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: theme.spacing(3),
              rowGap: theme.spacing(3.5),
              py: theme.spacing(0.5),
            }}
          >
            <LabelValue label="Customer name">
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, fontSize: theme.typography.body2.fontSize }}>
                {customer!.name}
              </Typography>
            </LabelValue>
            <LabelValue label="Sector">
              {customer!.sector ? (
                <MuiChip
                  label={customer!.sector}
                  size="small"
                  sx={{
                    height: 22,
                    fontWeight: 600,
                    fontSize: theme.typography.caption.fontSize,
                    bgcolor: theme.palette.grey[100],
                    color: theme.palette.grey[700],
                    borderRadius: tokens.borderRadius.lg,
                  }}
                />
              ) : (
                <Typography variant="body2" color="text.disabled">—</Typography>
              )}
            </LabelValue>
            <LabelValue label="Status">
              <StatusBadge status={customer!.status.toLowerCase() as StatusType} />
            </LabelValue>
            <LabelValue label="GST status">
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: theme.typography.body2.fontSize,
                  color: gstRegistered ? 'success.main' : 'text.primary',
                }}
              >
                {customer!.gstStatus}
              </Typography>
            </LabelValue>
            <LabelValue label="City">
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, fontSize: theme.typography.body2.fontSize }}>
                {customer!.city || '—'}
              </Typography>
            </LabelValue>
            <LabelValue label="State">
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, fontSize: theme.typography.body2.fontSize }}>
                {customer!.state || '—'}
              </Typography>
            </LabelValue>
            <LabelValue label="Pincode">
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, fontSize: theme.typography.body2.fontSize }}>
                {customer!.pincode?.trim() ? customer!.pincode : '—'}
              </Typography>
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
          <RecordDetailSectionTitle>Documents</RecordDetailSectionTitle>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: theme.spacing(2.5),
              py: theme.spacing(0.5),
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: theme.spacing(1.5) }}>
              {customer!.gstDocument ? (
                <PODocumentLinkField
                  label="GST document"
                  fileName={customer!.gstDocument.name}
                  documentUrl={customer!.gstDocument.url}
                  onOpenFailed={() =>
                    showToast({ title: 'Unable to open document', variant: 'error' })
                  }
                />
              ) : (
                <LabelValue label="GST document">
                  <Typography variant="body2" color="text.disabled">—</Typography>
                </LabelValue>
              )}
              <Typography
                variant="body2"
                sx={{
                  letterSpacing: '0.5px',
                  color: 'text.primary',
                  fontWeight: 500,
                  fontSize: theme.typography.body2.fontSize,
                }}
              >
                {customer!.gstin ? (
                  <>
                    GSTIN -{' '}
                    <Box component="span" sx={{ fontFamily: mono }}>
                      {customer!.gstin}
                    </Box>
                  </>
                ) : (
                  '—'
                )}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: theme.spacing(1.5) }}>
              {customer!.panDocument ? (
                <PODocumentLinkField
                  label="PAN document"
                  fileName={customer!.panDocument.name}
                  documentUrl={customer!.panDocument.url}
                  onOpenFailed={() =>
                    showToast({ title: 'Unable to open document', variant: 'error' })
                  }
                />
              ) : (
                <LabelValue label="PAN document">
                  <Typography variant="body2" color="text.disabled">—</Typography>
                </LabelValue>
              )}
              <Typography
                variant="body2"
                sx={{
                  letterSpacing: '0.5px',
                  color: 'text.primary',
                  fontWeight: 500,
                  fontSize: theme.typography.body2.fontSize,
                }}
              >
                {customer!.pan ? (
                  <>
                    PAN -{' '}
                    <Box component="span" sx={{ fontFamily: mono }}>
                      {customer!.pan}
                    </Box>
                  </>
                ) : (
                  '—'
                )}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={getRecordDetailFlatSectionSx(theme, { isLast: true })}>
          <RecordDetailSectionTitle>Address & location</RecordDetailSectionTitle>
          {street || cityState ? (
            <Box>
              {street ? (
                <Typography
                  variant="body2"
                  sx={{ color: 'text.primary', fontWeight: 500, fontSize: theme.typography.body2.fontSize }}
                >
                  {street}
                </Typography>
              ) : null}
              {cityState ? (
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 500,
                    fontSize: theme.typography.body2.fontSize,
                    mt: street ? 0.5 : 0,
                  }}
                >
                  {cityState}
                </Typography>
              ) : null}
            </Box>
          ) : (
            <Typography variant="body2" color="text.disabled">
              No address added
            </Typography>
          )}
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
                      onClick={() => setDeleteContactTarget(contact)}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                    >
                      <Delete sx={{ fontSize: 15 }} />
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
          <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
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
              Projects linked to this customer will appear here
            </Typography>
          </Box>
        </WorkspaceSection>
      )
    }

    const headerCellSx = {
      fontSize: 11,
      fontWeight: 600,
      color: 'text.secondary',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.4px',
      bgcolor: 'action.hover',
      borderBottom: '1px solid',
      borderColor: 'divider',
      py: 1.25,
    }

    return (
      <WorkspaceSection title="Linked Projects">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>Project Name</TableCell>
              <TableCell sx={headerCellSx}>Status</TableCell>
              <TableCell sx={headerCellSx}>Value</TableCell>
              <TableCell sx={headerCellSx}>Manager</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {linkedProjects.map((project) => (
              <TableRow
                key={project.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <TableCell sx={{ fontSize: 13, borderColor: 'divider' }}>{project.name}</TableCell>
                <TableCell sx={{ borderColor: 'divider' }}>
                  <StatusBadge
                    status={project.status.toLowerCase() as StatusType}
                  />
                </TableCell>
                <TableCell sx={{ fontSize: 13, borderColor: 'divider' }}>
                  {formatCurrency(project.totalClientPOValue || 0)}
                </TableCell>
                <TableCell sx={{ fontSize: 13, borderColor: 'divider' }}>
                  {project.projectManager || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </WorkspaceSection>
    )
  }

  // ── renderFinancial ────────────────────────────────────────────────────────

  function renderFinancial() {
    if (financialLoading) {
      return (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      )
    }

    const fd = financialDetails ?? customer!.financialDetails
    if (!fd) {
      return (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Financial details not available
          </Typography>
        </Box>
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
              {
                label: 'Outstanding',
                value: (
                  <Box sx={{ color: fd.outstanding > 0 ? 'error.main' : 'success.main' }}>
                    {fmt(fd.outstanding)}
                  </Box>
                ),
              },
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
              {
                label: 'Last Invoice Date',
                value: fd.lastInvoiceDate ? formatDate(fd.lastInvoiceDate) : '—',
              },
            ]}
          />
        </Grid>
      </Grid>
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
                    <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.4 }}>
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

  // ── tab content ────────────────────────────────────────────────────────────

  function renderTabContent() {
    switch (activeTab) {
      case 'overview':   return renderOverview()
      case 'contacts':   return renderContacts()
      case 'projects':   return renderProjects()
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
        onSuccess={() => {
          if (customer?.id) void dispatch(fetchCustomerById(customer.id))
        }}
      />

      {/* Add/Edit contact drawer */}
      <ContactDrawer
        open={contactDrawerOpen}
        onClose={() => { setContactDrawerOpen(false); setEditingContact(null) }}
        mode={editingContact ? 'edit' : 'add'}
        contact={editingContact}
        onSave={handleSaveContact}
      />

      <ConfirmDialog
        open={Boolean(deleteContactTarget)}
        onClose={() => {
          if (deletingContact) return
          setDeleteContactTarget(null)
        }}
        onConfirm={handleDeleteContact}
        loading={deletingContact}
        variant="destructive"
        title="Delete contact?"
        description={
          deleteContactTarget
            ? `Remove “${deleteContactTarget.name}” from this customer? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete Contact"
        cancelLabel="Keep Contact"
      />

    </>
  )
}
