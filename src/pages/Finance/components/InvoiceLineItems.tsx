import { useState } from 'react'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton as MuiIconButton,
  Typography,
} from '@mui/material'
import { Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Input, Select } from '@/design-system/components'
import type { LineItem, LineSource } from '@/slices/receivables/reducer'
import type { Service, SACCode } from '@/slices/settings/reducer'
import { tokens } from '@/design-system/tokens'
import { formatInr } from '@/utils/formatters'

export interface DraftLineItem {
  id: string
  serviceId: string
  serviceName: string
  sacCode: string
  amount: number
  gstRate: number
  gstAmount: number
  milestoneId?: string
  baselineServiceId?: string
  lineSource?: LineSource
  /** Max base amount for this row (project-derived); enforced in UI */
  maxAmount?: number
}

function computeGst(amount: number, gstRate: number): number {
  return Math.round(amount * (gstRate / 100) * 100) / 100
}

function resolveSac(sacCodes: SACCode[], service: Service | undefined): string {
  if (!service?.sacCodeId) return '—'
  return sacCodes.find((s) => s.id === service.sacCodeId)?.code ?? '—'
}

export interface InvoiceLineItemsProps {
  mode: 'edit' | 'read'
  lines: DraftLineItem[] | LineItem[]
  services: Service[]
  sacCodes: SACCode[]
  onChange?: (lines: DraftLineItem[]) => void
  error?: string
  /** When true, milestone/service rows show description as text and cannot be deleted; manual rows use Select + delete. */
  projectSourced?: boolean
  /** Allow zero lines (project flow before selection). */
  allowEmpty?: boolean
  /** Collapsed "Add manual line" until expanded */
  manualAddCollapsed?: boolean
}

export function emptyDraftLine(): DraftLineItem {
  return {
    id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    serviceId: '',
    serviceName: '',
    sacCode: '',
    amount: 0,
    gstRate: 18,
    gstAmount: 0,
    lineSource: 'manual',
  }
}

export function InvoiceLineItems({
  mode,
  lines,
  services,
  sacCodes,
  onChange,
  error,
  projectSourced = false,
  allowEmpty = false,
  manualAddCollapsed = false,
}: InvoiceLineItemsProps) {
  const activeServices = services.filter((s) => s.status === 'active')
  const [manualOpen, setManualOpen] = useState(!manualAddCollapsed)

  function updateLine(index: number, patch: Partial<DraftLineItem>) {
    if (!onChange) return
    const next = [...(lines as DraftLineItem[])]
    const cur = { ...next[index], ...patch }
    if (patch.serviceId !== undefined) {
      const svc = activeServices.find((s) => s.id === patch.serviceId)
      cur.serviceName = svc?.name ?? ''
      cur.gstRate = svc?.gstRate ?? 18
      cur.sacCode = resolveSac(sacCodes, svc)
    }
    if (patch.amount !== undefined || patch.gstRate !== undefined || patch.serviceId !== undefined) {
      let amt = cur.amount
      if (cur.maxAmount !== undefined && cur.maxAmount >= 0) {
        amt = Math.min(amt, cur.maxAmount)
      }
      cur.amount = amt
      cur.gstAmount = computeGst(cur.amount, cur.gstRate)
    }
    next[index] = cur
    onChange(next)
  }

  function removeLine(index: number) {
    if (!onChange) return
    const row = (lines as DraftLineItem[])[index]
    if (projectSourced && row.lineSource && row.lineSource !== 'manual') return
    const next = (lines as DraftLineItem[]).filter((_, i) => i !== index)
    if (!allowEmpty && next.length === 0) {
      onChange([emptyDraftLine()])
    } else {
      onChange(next)
    }
  }

  function addManualLine() {
    if (!onChange) return
    onChange([...(lines as DraftLineItem[]), emptyDraftLine()])
    setManualOpen(true)
  }

  const baseTotal = lines.reduce((s, l) => s + l.amount, 0)
  const gstTotal = lines.reduce((s, l) => s + l.gstAmount, 0)

  const descLabel = projectSourced ? 'Service / milestone' : 'Service'

  return (
    <Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>
                {descLabel}
              </TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 100 }}>
                SAC Code
              </TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 120 }}>
                Amount
              </TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 88 }}>
                GST %
              </TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 100 }}>
                GST Amt
              </TableCell>
              {mode === 'edit' && <TableCell sx={{ width: 48 }} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.length === 0 && mode === 'edit' ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary">
                    No lines yet — select milestones or services above, or add a manual line.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {lines.map((row, index) => {
              const draft = row as DraftLineItem
              const isManual = !projectSourced || draft.lineSource === 'manual' || !draft.lineSource
              return mode === 'read' ? (
                <TableRow key={row.id}>
                  <TableCell sx={{ fontSize: 12 }}>{row.serviceName}</TableCell>
                  <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{row.sacCode}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>₹{formatInr(row.amount)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{row.gstRate}%</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>₹{formatInr(row.gstAmount)}</TableCell>
                </TableRow>
              ) : (
                <TableRow key={row.id}>
                  <TableCell sx={{ py: 1.5, verticalAlign: 'top' }}>
                    {isManual ? (
                      <Select
                        size="sm"
                        placeholder="Select service"
                        value={draft.serviceId}
                        onChange={(v) => updateLine(index, { serviceId: String(v) })}
                        options={activeServices.map((s) => ({ label: s.name, value: s.id }))}
                        fullWidth
                      />
                    ) : (
                      <Typography variant="body2" sx={{ py: 0.5 }}>
                        {draft.serviceName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', verticalAlign: 'middle' }}>
                    {draft.sacCode || '—'}
                  </TableCell>
                  <TableCell sx={{ py: 1.5, verticalAlign: 'top' }}>
                    <Input
                      size="sm"
                      type="number"
                      value={row.amount ? String(row.amount) : ''}
                      onChange={(v) => updateLine(index, { amount: Number(v) || 0 })}
                      fullWidth
                    />
                    {draft.maxAmount !== undefined && draft.maxAmount >= 0 && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Max ₹{formatInr(draft.maxAmount)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'middle' }}>
                    <Badge label={`${row.gstRate}%`} size="sm" color="neutral" variant="soft" />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, verticalAlign: 'middle' }}>
                    ₹{formatInr(row.gstAmount)}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'middle' }}>
                    <MuiIconButton
                      size="small"
                      onClick={() => removeLine(index)}
                      disabled={
                        (projectSourced && draft.lineSource !== 'manual' && draft.lineSource !== undefined) ||
                        (!allowEmpty && lines.length <= 1 && draft.lineSource === 'manual')
                      }
                      sx={{ color: tokens.color.neutral[400] }}
                    >
                      <Trash2 size={14} />
                    </MuiIconButton>
                  </TableCell>
                </TableRow>
              )
            })}
            {mode === 'read' && lines.length > 0 && (
              <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
                <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Subtotal</TableCell>
                <TableCell>—</TableCell>
                <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>₹{formatInr(baseTotal)}</TableCell>
                <TableCell>—</TableCell>
                <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>₹{formatInr(gstTotal)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {mode === 'edit' && projectSourced && manualAddCollapsed && !manualOpen ? (
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" size="sm" color="primary" onClick={() => setManualOpen(true)} label="Add manual line" />
        </Box>
      ) : null}
      {mode === 'edit' && (!projectSourced || !manualAddCollapsed || manualOpen) ? (
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" size="sm" color="primary" startIcon={<Plus size={14} />} onClick={addManualLine}>
            Add manual line
          </Button>
        </Box>
      ) : null}
      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  )
}

export { computeGst }
