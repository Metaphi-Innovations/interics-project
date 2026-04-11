import { useState } from 'react'
import {
  Box, Typography, Tabs, Tab,
  Table, TableHead, TableRow, TableCell, TableBody,
  Drawer, TextField, MenuItem, IconButton,
} from '@mui/material'
import { Edit, ToggleOff, ToggleOn } from '@mui/icons-material'
import { Button } from '@/design-system/components'
import { StatusBadge } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchGSTRates, createGSTRate, updateGSTRate, toggleGSTRateStatus,
  fetchTDSSections, createTDSSection, updateTDSSection, toggleTDSSectionStatus,
} from '@/slices/settings/thunk'
import type { GSTRate, TDSSection } from '@/slices/settings/reducer'
import { useToast } from '@/design-system/components'
import { useEffect } from 'react'

type GSTForm = Omit<GSTRate, 'id'>
type TDSForm = Omit<TDSSection, 'id'>

const defaultGSTForm: GSTForm = { slabName: '', rate: 0, description: '', status: 'active' }
const defaultTDSForm: TDSForm = { section: '', description: '', defaultRate: 0, appliesTo: 'both', status: 'active' }

export default function TaxConfigSection() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const { gstRates, tdsSections, saving } = useAppSelector(s => s.settings)
  const [tab, setTab] = useState(0)

  // GST drawer state
  const [gstDrawerOpen, setGstDrawerOpen] = useState(false)
  const [editingGST, setEditingGST] = useState<GSTRate | null>(null)
  const [gstForm, setGstForm] = useState<GSTForm>(defaultGSTForm)

  // TDS drawer state
  const [tdsDrawerOpen, setTdsDrawerOpen] = useState(false)
  const [editingTDS, setEditingTDS] = useState<TDSSection | null>(null)
  const [tdsForm, setTdsForm] = useState<TDSForm>(defaultTDSForm)

  useEffect(() => {
    dispatch(fetchGSTRates())
    dispatch(fetchTDSSections())
  }, [dispatch])

  // --- GST handlers ---
  const openAddGST = () => {
    setEditingGST(null)
    setGstForm(defaultGSTForm)
    setGstDrawerOpen(true)
  }
  const openEditGST = (row: GSTRate) => {
    setEditingGST(row)
    setGstForm({ slabName: row.slabName, rate: row.rate, description: row.description, status: row.status })
    setGstDrawerOpen(true)
  }
  const handleSaveGST = () => {
    const action = editingGST
      ? dispatch(updateGSTRate({ id: editingGST.id, ...gstForm }))
      : dispatch(createGSTRate(gstForm))
    action.unwrap()
      .then(() => {
        setGstDrawerOpen(false)
        toast({ message: editingGST ? 'GST rate updated' : 'GST rate added', severity: 'success' })
      })
      .catch(() => toast({ message: 'Failed to save GST rate', severity: 'error' }))
  }
  const handleToggleGST = (row: GSTRate) => {
    dispatch(toggleGSTRateStatus(row.id))
  }

  // --- TDS handlers ---
  const openAddTDS = () => {
    setEditingTDS(null)
    setTdsForm(defaultTDSForm)
    setTdsDrawerOpen(true)
  }
  const openEditTDS = (row: TDSSection) => {
    setEditingTDS(row)
    setTdsForm({ section: row.section, description: row.description, defaultRate: row.defaultRate, appliesTo: row.appliesTo, status: row.status })
    setTdsDrawerOpen(true)
  }
  const handleSaveTDS = () => {
    const action = editingTDS
      ? dispatch(updateTDSSection({ id: editingTDS.id, ...tdsForm }))
      : dispatch(createTDSSection(tdsForm))
    action.unwrap()
      .then(() => {
        setTdsDrawerOpen(false)
        toast({ message: editingTDS ? 'TDS section updated' : 'TDS section added', severity: 'success' })
      })
      .catch(() => toast({ message: 'Failed to save TDS section', severity: 'error' }))
  }
  const handleToggleTDS = (row: TDSSection) => {
    dispatch(toggleTDSSectionStatus(row.id))
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={0.5}>Tax Configuration</Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        GST slabs and TDS sections used across invoicing
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #E8EEEC', mb: 3 }}>
        <Tab label="GST Rates" sx={{ textTransform: 'none', fontSize: 13 }} />
        <Tab label="TDS Sections" sx={{ textTransform: 'none', fontSize: 13 }} />
      </Tabs>

      {/* GST Rates Tab */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" fontWeight={600}>Goods & Services Tax (GST) Slabs</Typography>
            <Button variant="primary" size="sm" onClick={openAddGST}>+ Add Rate</Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFB' }}>
                <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Slab Name</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 120 }}>Rate %</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Description</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 100 }}>Status</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 80 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gstRates.map(row => (
                <TableRow key={row.id} sx={{ height: 44 }}>
                  <TableCell sx={{ fontSize: 12 }}>{row.slabName}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{row.rate}%</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{row.description}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openEditGST(row)}>
                      <Edit sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleToggleGST(row)}>
                      {row.status === 'active'
                        ? <ToggleOff sx={{ fontSize: 14, color: 'warning.main' }} />
                        : <ToggleOn sx={{ fontSize: 14, color: 'success.main' }} />}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* TDS Sections Tab */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" fontWeight={600}>TDS Sections</Typography>
            <Button variant="primary" size="sm" onClick={openAddTDS}>+ Add Section</Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFB' }}>
                <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 120 }}>Section</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Description</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 130 }}>Default Rate %</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 120 }}>Applies To</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 100 }}>Status</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 80 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tdsSections.map(row => (
                <TableRow key={row.id} sx={{ height: 44 }}>
                  <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{row.section}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{row.description}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{row.defaultRate}%</TableCell>
                  <TableCell sx={{ fontSize: 12, textTransform: 'capitalize' }}>{row.appliesTo}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openEditTDS(row)}>
                      <Edit sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleToggleTDS(row)}>
                      {row.status === 'active'
                        ? <ToggleOff sx={{ fontSize: 14, color: 'warning.main' }} />
                        : <ToggleOn sx={{ fontSize: 14, color: 'success.main' }} />}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* GST Drawer */}
      <Drawer anchor="right" open={gstDrawerOpen} onClose={() => setGstDrawerOpen(false)}>
        <Box sx={{ width: 400, p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={3}>
            {editingGST ? 'Edit GST Rate' : 'Add GST Rate'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              size="small"
              label="Slab Name"
              required
              placeholder="e.g. GST 18%"
              value={gstForm.slabName}
              onChange={e => setGstForm(f => ({ ...f, slabName: e.target.value }))}
            />
            <TextField
              size="small"
              label="Rate (%)"
              type="number"
              required
              placeholder="18"
              value={gstForm.rate}
              onChange={e => setGstForm(f => ({ ...f, rate: Number(e.target.value) }))}
            />
            <TextField
              size="small"
              label="Description"
              placeholder="e.g. Standard Services Rate"
              value={gstForm.description}
              onChange={e => setGstForm(f => ({ ...f, description: e.target.value }))}
            />
            <TextField
              select
              size="small"
              label="Status"
              value={gstForm.status}
              onChange={e => setGstForm(f => ({ ...f, status: e.target.value as GSTRate['status'] }))}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 4 }}>
            <Button size="sm" variant="secondary" onClick={() => setGstDrawerOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={handleSaveGST} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* TDS Drawer */}
      <Drawer anchor="right" open={tdsDrawerOpen} onClose={() => setTdsDrawerOpen(false)}>
        <Box sx={{ width: 400, p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={3}>
            {editingTDS ? 'Edit TDS Section' : 'Add TDS Section'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              size="small"
              label="Section"
              required
              placeholder="e.g. 194C"
              value={tdsForm.section}
              onChange={e => setTdsForm(f => ({ ...f, section: e.target.value }))}
            />
            <TextField
              size="small"
              label="Description"
              required
              value={tdsForm.description}
              onChange={e => setTdsForm(f => ({ ...f, description: e.target.value }))}
            />
            <TextField
              size="small"
              label="Default Rate (%)"
              type="number"
              required
              value={tdsForm.defaultRate}
              onChange={e => setTdsForm(f => ({ ...f, defaultRate: Number(e.target.value) }))}
            />
            <TextField
              select
              size="small"
              label="Applies To"
              required
              value={tdsForm.appliesTo}
              onChange={e => setTdsForm(f => ({ ...f, appliesTo: e.target.value as TDSSection['appliesTo'] }))}
            >
              <MenuItem value="vendors">Vendors</MenuItem>
              <MenuItem value="clients">Clients</MenuItem>
              <MenuItem value="both">Both</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Status"
              value={tdsForm.status}
              onChange={e => setTdsForm(f => ({ ...f, status: e.target.value as TDSSection['status'] }))}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 4 }}>
            <Button size="sm" variant="secondary" onClick={() => setTdsDrawerOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={handleSaveTDS} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  )
}
