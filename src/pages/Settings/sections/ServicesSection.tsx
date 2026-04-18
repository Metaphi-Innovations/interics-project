import { useState, useEffect } from 'react'
import {
  Box, Typography, Chip, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody,
  Drawer, IconButton, Divider,
} from '@mui/material'
import { Edit, ToggleOff, ToggleOn } from '@mui/icons-material'
import { Button } from '@/design-system/components'
import { StatusBadge } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchServices, createService, updateService, toggleServiceStatus,
  fetchCategories, fetchSACCodes, fetchGSTRates,
} from '@/slices/settings/thunk'
import type { Service } from '@/slices/settings/reducer'
import { useToast } from '@/design-system/components'

type ServiceForm = Omit<Service, 'id'>

const defaultForm: ServiceForm = {
  name: '',
  categoryId: '',
  sacCodeId: null,
  gstRate: 0,
  allowGSTOverride: false,
  allowVendorMapping: false,
  tags: [],
  status: 'active',
}

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#107E68', textTransform: 'uppercase', display: 'block', mb: 1 }}>
        {label}
      </Typography>
      <Divider sx={{ mb: 1.5 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {children}
      </Box>
    </Box>
  )
}

export default function ServicesSection() {
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { services, categories, sacCodes, gstRates, saving } = useAppSelector(s => s.settings)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<Service | null>(null)
  const [form, setForm] = useState<ServiceForm>(defaultForm)
  const [resolvedGSTRate, setResolvedGSTRate] = useState(0)

  useEffect(() => {
    dispatch(fetchServices())
    dispatch(fetchCategories())
    dispatch(fetchSACCodes())
    dispatch(fetchGSTRates())
  }, [dispatch])

  const activeCategories = categories.filter(c => c.status === 'active')
  const activeSACCodes = sacCodes.filter(s => s.status === 'active')

  const filtered = services.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'all' || s.categoryId === categoryFilter
    return matchSearch && matchCat
  })

  const openAdd = () => {
    setEditingRow(null)
    setForm(defaultForm)
    setResolvedGSTRate(0)
    setDrawerOpen(true)
  }

  const openEdit = (row: Service) => {
    setEditingRow(row)
    const sac = sacCodes.find(s => s.id === row.sacCodeId)
    const linked = gstRates.find(g => g.id === sac?.gstRateId)
    const rateFromSac = linked?.rate ?? row.gstRate
    setForm({
      name: row.name,
      categoryId: row.categoryId,
      sacCodeId: row.sacCodeId,
      gstRate: rateFromSac,
      allowGSTOverride: false,
      allowVendorMapping: false,
      tags: row.tags,
      status: row.status,
    })
    setResolvedGSTRate(rateFromSac)
    setDrawerOpen(true)
  }

  const handleSACChange = (sacId: string) => {
    const sac = sacCodes.find(s => s.id === sacId)
    const linked = gstRates.find(g => g.id === sac?.gstRateId)
    const rate = linked?.rate ?? 0
    setResolvedGSTRate(rate)
    setForm(f => ({
      ...f,
      sacCodeId: sacId,
      gstRate: rate,
    }))
  }

  const handleSave = () => {
    const sac = sacCodes.find(s => s.id === form.sacCodeId)
    const linked = gstRates.find(g => g.id === sac?.gstRateId)
    const gstRate = linked?.rate ?? form.gstRate
    const payload: ServiceForm = {
      ...form,
      allowGSTOverride: false,
      allowVendorMapping: false,
      gstRate,
    }
    dispatch(editingRow
      ? updateService({ id: editingRow.id, ...payload })
      : createService(payload)
    ).unwrap()
      .then(() => {
        setDrawerOpen(false)
        success(editingRow ? 'Service updated' : 'Service added')
      })
      .catch(() => error('Failed to save service'))
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>Services Master</Typography>
          <Typography variant="caption" color="text.secondary">Atomic units used in Pitch builder and invoicing</Typography>
        </Box>
        <Button variant="contained" color="primary" size="sm" onClick={openAdd}>+ Add Service</Button>
      </Box>

      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search services..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 240 }}
        />
        <TextField
          select
          size="small"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          sx={{ width: 200 }}
        >
          <MenuItem value="all">All Categories</MenuItem>
          {activeCategories.map(c => (
            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
          ))}
        </TextField>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#F8FAFB' }}>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Service Name</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 160 }}>Category</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 120 }}>SAC Code</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 100 }}>GST Rate</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 100 }}>Status</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 80 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map(row => {
            const cat = categories.find(c => c.id === row.categoryId)
            const sac = sacCodes.find(s => s.id === row.sacCodeId)
            return (
              <TableRow key={row.id} sx={{ height: 44 }}>
                <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>{row.name}</TableCell>
                <TableCell>
                  <Chip size="small" label={cat?.name ?? '—'} sx={{ fontSize: 11, height: 20, bgcolor: '#F3F4F6', color: '#374151' }} />
                </TableCell>
                <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{sac?.code ?? '—'}</TableCell>
                <TableCell>
                  <Chip size="small" label={`${row.gstRate}%`} sx={{ fontSize: 11, height: 20, bgcolor: '#E8F5F2', color: '#107E68' }} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(row)}>
                    <Edit sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => dispatch(toggleServiceStatus(row.id))}>
                    {row.status === 'active'
                      ? <ToggleOff sx={{ fontSize: 14, color: 'warning.main' }} />
                      : <ToggleOn sx={{ fontSize: 14, color: 'success.main' }} />}
                  </IconButton>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 480, p: 3, overflowY: 'auto' }}>
          <Typography variant="h6" fontWeight={600} mb={3}>
            {editingRow ? 'Edit Service' : 'Add Service'}
          </Typography>

          <FormSection label="Service Details">
            <TextField
              size="small"
              label="Service Name"
              required
              placeholder="e.g. Interior Design"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <TextField
              select
              size="small"
              label="Category"
              required
              value={form.categoryId}
              onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
            >
              {activeCategories.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
          </FormSection>

          <FormSection label="Tax Configuration">
            <TextField
              select
              size="small"
              label="SAC Code"
              required
              value={form.sacCodeId ?? ''}
              onChange={e => handleSACChange(e.target.value)}
            >
              {activeSACCodes.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.code} — {s.description}</MenuItem>
              ))}
            </TextField>

            <Box sx={{ p: 1.5, bgcolor: '#F8FAFB', borderRadius: '8px', border: '1px solid #E8EEEC', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">GST Rate (from SAC):</Typography>
              <Chip size="small" label={`${resolvedGSTRate}%`} sx={{ bgcolor: '#E8F5F2', color: '#107E68', fontSize: 11, height: 20 }} />
              <Typography variant="caption" color="text.disabled">Auto-applied</Typography>
            </Box>
          </FormSection>

          <Box sx={{ mb: 2 }}>
            <TextField
              select
              size="small"
              label="Status"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as Service['status'] }))}
              fullWidth
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            <Button size="sm" variant="outlined" color="secondary" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button size="sm" variant="contained" color="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  )
}
