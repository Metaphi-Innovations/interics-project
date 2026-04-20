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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Description,
  Add,
  Delete,
  Star,
  StarBorder,
  AutoAwesome,
  EditNote,
  Person,
  Sync,
  PictureAsPdf,
} from '@mui/icons-material'
import { Plus } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchCustomerById, updateCustomer } from '../../slices/customers/thunk'
import { clearSelected } from '../../slices/customers/reducer'
import type { Contact, ActivityEntry } from '../../slices/customers/reducer'
import {
  WorkspaceDetail,
  WorkspaceSection,
  WorkspaceTwoCol,
} from '../../components/templates'
import { CustomerDrawer } from './CustomerDrawer'
import { ContactDrawer } from '../../components/ContactDrawer'
import { StatusBadge, CopyButton, useToast, Button } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import {
  getInitials,
  getAvatarColor,
  formatCurrency,
} from '../../utils/formatters'
import { tokens } from '@/design-system/tokens'
import { useTheme, alpha } from '@mui/material/styles'
import dayjs from 'dayjs'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LabelValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
        {label}
      </Typography>
      <Box sx={{ mt: '2px' }}>{children}</Box>
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

function activityIcon(type: ActivityEntry['type']) {
  const size = 14
  switch (type) {
    case 'record_created':   return <AutoAwesome sx={{ fontSize: size, color: 'primary.main' }} />
    case 'profile_edited':   return <EditNote sx={{ fontSize: size, color: 'info.main' }} />
    case 'contact_added':
    case 'contact_removed':  return <Person sx={{ fontSize: size, color: 'success.main' }} />
    case 'primary_changed':  return <Star sx={{ fontSize: size, color: 'warning.main' }} />
    case 'document_uploaded':return <Description sx={{ fontSize: size, color: 'info.main' }} />
    case 'status_changed':   return <Sync sx={{ fontSize: size, color: 'error.main' }} />
    default:                 return <EditNote sx={{ fontSize: size }} />
  }
}

// ─── CustomerDetailPage ───────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const { id: slug } = useParams<{ id: string }>()
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
  const [deleteConfirmContact, setDeleteConfirmContact] = useState<Contact | null>(null)

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
    if (customer) {
      setContacts(customer.contacts ?? [])
    }
  }, [customer])

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

  function primaryContact(): Contact | undefined {
    return contacts.find((c) => c.isPrimary)
  }

  function handleSaveContact(data: Omit<Contact, 'id'> & { id?: string }) {
    if (data.id) {
      // Edit
      setContacts((prev) => {
        const updated = prev.map((c) => {
          if (data.isPrimary) return { ...c, isPrimary: c.id === data.id }
          return c.id === data.id ? { ...c, ...data, id: c.id } : c
        })
        return updated
      })
      showToast({ title: 'Contact updated', variant: 'success' })
    } else {
      // Add
      const newId = `cc-local-${Date.now()}`
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
  if (notFound || !customer) return <NotFound />

  const tabs = [
    { label: 'Overview', value: 'overview' },
    { label: 'Documents & Tax', value: 'docs-tax' },
    { label: 'Contacts', value: 'contacts' },
    { label: 'Linked Projects', value: 'projects' },
    { label: 'Billing History', value: 'billing' },
    { label: 'Financial Details', value: 'financial' },
    { label: 'Activity', value: 'activity' },
  ]

  // ── renderOverview ─────────────────────────────────────────────────────────

  function renderOverview() {
    const primary = primaryContact()
    return (
      <Box>
        <WorkspaceTwoCol>
          {/* Left column */}
          <Box>
            <WorkspaceSection title="Customer Profile">
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <LabelValue label="Customer Name">
                  <Typography variant="body2" fontWeight={500}>{customer!.name}</Typography>
                </LabelValue>
                <LabelValue label="Customer Type">
                  <MuiChip label={customer!.type} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                </LabelValue>
                <LabelValue label="Status">
                  <StatusBadge status={customer!.status.toLowerCase() as StatusType} />
                </LabelValue>
              </Box>
            </WorkspaceSection>

            <WorkspaceSection title="Address & Location">
              <Typography variant="body2" color="text.secondary">
                {customer!.address && <>{customer!.address}<br /></>}
                {customer!.city}, {customer!.state}
                {customer!.pincode && ` - ${customer!.pincode}`}
              </Typography>
            </WorkspaceSection>
          </Box>

          {/* Right column */}
          <Box>
            <WorkspaceSection title="Contact Details">
              {primary ? (
                <Stack direction="row" alignItems="flex-start" gap={2}
                  sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                >
                  <Box
                    sx={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      bgcolor: getAvatarColor(primary.name).bg,
                      color: getAvatarColor(primary.name).text,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700,
                    }}
                  >
                    {getInitials(primary.name)}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: 14 }}>
                      {primary.name}
                    </Typography>
                    {primary.designation && (
                      <Typography variant="caption" color="text.secondary">{primary.designation}</Typography>
                    )}
                    <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 1 }}>
                      <Phone sx={{ fontSize: 12, color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ fontSize: 12 }}>{primary.phone}</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <Email sx={{ fontSize: 12, color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ fontSize: 12 }}>{primary.email}</Typography>
                    </Stack>
                  </Box>
                </Stack>
              ) : (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Person sx={{ fontSize: 28, color: tokens.color.neutral[300], mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    No contact added yet
                  </Typography>
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="sm"
                    startIcon={<Plus size={14} strokeWidth={2} />}
                    onClick={() => { setEditingContact(null); setContactDrawerOpen(true) }}
                  >
                    Add Contact
                  </Button>
                </Box>
              )}
            </WorkspaceSection>
          </Box>
        </WorkspaceTwoCol>

        {/* Tags & Notes below the two-col */}
        {(customer!.tags.length > 0 || customer!.notes) && (
          <WorkspaceSection title="Tags & Notes">
            {customer!.tags.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: customer!.notes ? 1.5 : 0 }}>
                {customer!.tags.map((tag) => (
                  <MuiChip key={tag} label={tag} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                ))}
              </Stack>
            )}
            {customer!.notes && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                {customer!.notes}
              </Typography>
            )}
          </WorkspaceSection>
        )}
      </Box>
    )
  }

  // ── renderDocsTax ──────────────────────────────────────────────────────────

  function renderDocsTax() {
    return (
      <Box>
        <WorkspaceSection title="GST Registration">
          <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap" sx={{ py: 0.5 }}>
            <StatusBadge
              status={customer!.gstStatus === 'Unregistered' ? 'inactive' : 'active'}
              label={customer!.gstStatus}
            />
            <Typography variant="body2" color="text.secondary" component="span" sx={{ fontWeight: 500 }}>
              GSTIN:
            </Typography>
            {customer!.gstin ? (
              <>
                <Typography
                  variant="body2"
                  fontWeight={500}
                  sx={{ fontFamily: 'monospace', letterSpacing: 0.5, fontSize: 13 }}
                >
                  {customer!.gstin}
                </Typography>
                <CopyButton value={customer!.gstin} size="sm" />
              </>
            ) : (
              <Typography variant="body2" color="text.disabled">
                Not applicable
              </Typography>
            )}
            <Typography variant="body2" color="text.disabled" component="span" sx={{ userSelect: 'none' }}>
              |
            </Typography>
            {customer!.gstDocument ? (
              <Stack
                direction="row"
                alignItems="center"
                gap={0.5}
                onClick={() => openTaxDocument(customer!.gstDocument!.url)}
                sx={{ cursor: 'pointer' }}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openTaxDocument(customer!.gstDocument!.url)
                  }
                }}
              >
                <PictureAsPdf sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" color="primary.main" sx={{ fontSize: 13, textDecoration: 'underline' }}>
                  {customer!.gstDocument.name}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                No document uploaded
              </Typography>
            )}
          </Stack>
        </WorkspaceSection>

        <WorkspaceSection title="PAN / Income Tax">
          <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap" sx={{ py: 0.5 }}>
            <Typography variant="body2" color="text.secondary" component="span" sx={{ fontWeight: 500 }}>
              PAN:
            </Typography>
            {customer!.pan ? (
              <>
                <Typography
                  variant="body2"
                  fontWeight={500}
                  sx={{ fontFamily: 'monospace', letterSpacing: 0.5, fontSize: 13 }}
                >
                  {customer!.pan}
                </Typography>
                <CopyButton value={customer!.pan} size="sm" />
              </>
            ) : (
              <Typography variant="body2" color="text.disabled">
                Not provided
              </Typography>
            )}
            <Typography variant="body2" color="text.disabled" component="span" sx={{ userSelect: 'none' }}>
              |
            </Typography>
            {customer!.panDocument ? (
              <Stack
                direction="row"
                alignItems="center"
                gap={0.5}
                onClick={() => openTaxDocument(customer!.panDocument!.url)}
                sx={{ cursor: 'pointer' }}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openTaxDocument(customer!.panDocument!.url)
                  }
                }}
              >
                <PictureAsPdf sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" color="primary.main" sx={{ fontSize: 13, textDecoration: 'underline' }}>
                  {customer!.panDocument.name}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                No document uploaded
              </Typography>
            )}
          </Stack>
        </WorkspaceSection>
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
                    <MuiIconButton
                      size="small"
                      title="Edit contact"
                      onClick={() => { setEditingContact(contact); setContactDrawerOpen(true) }}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                    >
                      <Edit sx={{ fontSize: 15 }} />
                    </MuiIconButton>
                    {!contact.isPrimary && (
                      <MuiIconButton
                        size="small"
                        title="Set as primary"
                        onClick={() => handleSetPrimary(contact.id)}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'warning.main' } }}
                      >
                        <StarBorder sx={{ fontSize: 15 }} />
                      </MuiIconButton>
                    )}
                    <MuiIconButton
                      size="small"
                      title="Delete contact"
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
        <Grid size={{ xs: 12, md: 6 }}>
          <SummaryCard
            title="Terms & Configuration"
            rows={[
              { label: 'Payment Terms', value: fd.paymentTerms },
              { label: 'Credit Limit', value: fd.creditLimit ? fmt(fd.creditLimit) : <Typography variant="body2" color="text.disabled">Not set</Typography> },
              { label: 'GST Status', value: fd.gstStatus },
            ]}
          />
        </Grid>
      </Grid>
    )
  }

  // ── renderActivity ─────────────────────────────────────────────────────────

  function renderActivity() {
    const log = customer!.activityLog ?? []
    if (log.length === 0) {
      return (
        <WorkspaceSection>
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Activity log will appear here as changes are made
            </Typography>
          </Box>
        </WorkspaceSection>
      )
    }
    return (
      <WorkspaceSection title="Activity Log">
        <Stack gap={0}>
          {log.slice(0, 10).map((entry, i) => (
            <Stack key={entry.id} direction="row" alignItems="flex-start" gap={1.5}
              sx={{ position: 'relative', pb: i < log.length - 1 ? 2.5 : 0 }}
            >
              {/* Timeline line */}
              {i < log.length - 1 && (
                <Box sx={{
                  position: 'absolute', left: 15, top: 28, bottom: 0, width: 1,
                  bgcolor: 'divider', zIndex: 0,
                }} />
              )}
              {/* Icon circle */}
              <Box sx={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {activityIcon(entry.type)}
              </Box>
              {/* Content */}
              <Box sx={{ flex: 1, pt: '5px' }}>
                <Typography variant="body2" sx={{ fontSize: 13, lineHeight: 1.4 }}>
                  {entry.description}
                </Typography>
                <Stack direction="row" gap={1} sx={{ mt: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">{entry.user}</Typography>
                  <Typography variant="caption" color="text.disabled">·</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dayjs(entry.timestamp).format('DD MMM YYYY, h:mm A')}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          ))}
        </Stack>
      </WorkspaceSection>
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
      case 'docs-tax':   return renderDocsTax()
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

      {/* Delete primary contact warning dialog */}
      <Dialog open={!!deleteConfirmContact} onClose={() => setDeleteConfirmContact(null)} maxWidth="xs">
        <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Cannot Delete Primary Contact</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            <strong>{deleteConfirmContact?.name}</strong> is the primary contact. Please set another
            contact as primary before deleting this one.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button variant="outlined" color="secondary" size="sm" onClick={() => setDeleteConfirmContact(null)}>
            OK, got it
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
