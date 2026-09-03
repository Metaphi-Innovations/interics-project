/**
 * Project Management → Vendor PO Documents
 * Generate a Word PO doc and download it immediately.
 */
import { useEffect, useMemo, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { FormField } from '@/components/templates/DrawerForm'
import { Button, RadioGroup, Select, useToast } from '@/design-system/components'
import { WorkspaceSection } from '@/components/templates'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchVendorPOs } from '@/slices/baseline/thunk'
import type { Project } from '@/slices/projects/reducer'
import type { VendorPO } from '@/slices/baseline/reducer'
import { liveApi } from '@/api/liveApi'
import { downloadAuthenticatedDocument } from '@/utils/openAuthenticatedDocument'
import { ProjectTabSkeleton } from '../components/ProjectTabSkeleton'
import {
  VENDOR_PO_TEMPLATE_LABELS,
  type VendorPODocTemplate,
} from './generateVendorPODocx'

interface VendorPODocumentsSectionProps {
  project: Project
}

const TEMPLATE_OPTIONS = [
  { value: 'trade_contract', label: VENDOR_PO_TEMPLATE_LABELS.trade_contract },
  { value: 'supply_installation', label: VENDOR_PO_TEMPLATE_LABELS.supply_installation },
] as const

function VendorOptionLabel(po: VendorPO): string {
  return `${po.vendorName} (${po.poNumber})`
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

  useEffect(() => {
    void dispatch(fetchVendorPOs(project.id))
  }, [dispatch, project.id])

  useEffect(() => {
    setLoading(true)
    setVendorPoId('')
    const timer = window.setTimeout(() => setLoading(false), 0)
    return () => window.clearTimeout(timer)
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
      if (row.downloadUrl || row.viewUrl) {
        await downloadAuthenticatedDocument(
          row.downloadUrl || row.viewUrl,
          row.fileName || undefined,
          () => error('Document generated but download failed'),
        )
        success('Document generated', 'Download started.')
      } else {
        error('Document generated but no download URL was returned')
      }
    } catch {
      error('Failed to generate document')
    } finally {
      setGenerating(false)
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
      </Stack>
    </WorkspaceSection>
  )
}
