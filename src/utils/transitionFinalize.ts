import type { ClientPO } from '@/slices/baseline/reducer'
import type { PitchService } from '@/slices/pitch/reducer'
import type { TransitionDraft } from '@/utils/transitionDraft'
import { validateTransitionDraftForSave } from '@/utils/transitionDraft'

const PO_VALUE_EPS = 1

export interface TransitionFinalizeChecklistItem {
  id: string
  label: string
  done: boolean
  hint: string
}

export type TransitionFinalizeInput = {
  clientPOs: ClientPO[]
  selectedVersionId: string | null
  draft: TransitionDraft | null
}

function totalPOValue(clientPOs: ClientPO[]): number {
  return clientPOs.reduce((sum, po) => sum + po.poValue, 0)
}

function totalAdjustedServices(draft: TransitionDraft): number {
  return draft.categories.flatMap((c) => c.services).reduce((sum, s) => sum + s.value, 0)
}

/** Every service with positive value has at least one vendor mapping row. */
export function transitionAllServicesHaveVendors(draft: TransitionDraft): boolean {
  for (const cat of draft.categories) {
    for (const svc of cat.services) {
      if (svc.value <= 0) continue
      if ((svc.vendorMappings ?? []).length === 0) return false
    }
  }
  return true
}

/** Every vendor mapping with positive allocation has a quotation file. */
export function transitionAllQuotationsUploaded(draft: TransitionDraft): boolean {
  for (const cat of draft.categories) {
    for (const svc of cat.services) {
      for (const vm of svc.vendorMappings ?? []) {
        if (vm.value <= 0) continue
        const q = vm.quotation
        if (!q?.fileUrl || !q.fileName) return false
      }
    }
  }
  return true
}

export function transitionServiceValuesMatchPO(draft: TransitionDraft, clientPOs: ClientPO[]): boolean {
  const po = totalPOValue(clientPOs)
  if (po <= 0) return false
  const adj = totalAdjustedServices(draft)
  return Math.abs(adj - po) < PO_VALUE_EPS
}

export function getTransitionFinalizeChecklist(input: TransitionFinalizeInput): TransitionFinalizeChecklistItem[] {
  const { clientPOs, selectedVersionId, draft } = input
  const valuesAligned = draft ? transitionServiceValuesMatchPO(draft, clientPOs) : false
  const vendorsMapped = draft ? transitionAllServicesHaveVendors(draft) : false
  const saveValidation = draft ? validateTransitionDraftForSave(draft) : { ok: false, messages: [] as string[] }
  const milestonesValid = Boolean(draft && saveValidation.ok)
  const quotesOk = draft ? transitionAllQuotationsUploaded(draft) : false

  return [
    {
      id: 'po',
      label: 'Client PO uploaded',
      done: clientPOs.length > 0,
      hint: 'Add a client PO',
    },
    {
      id: 'version',
      label: 'Version selected',
      done: Boolean(selectedVersionId && draft),
      hint: 'Select a pitch version',
    },
    {
      id: 'aligned',
      label: 'Service values aligned',
      done: valuesAligned,
      hint: 'Total adjusted must match PO value',
    },
    {
      id: 'vendors',
      label: 'Vendors mapped',
      done: vendorsMapped,
      hint: 'Each service needs at least one vendor',
    },
    {
      id: 'milestones',
      label: 'Milestones valid',
      done: milestonesValid,
      hint: saveValidation.messages[0] ?? 'Fix vendor milestones and planned expenses',
    },
    {
      id: 'quotations',
      label: 'All quotations uploaded',
      done: quotesOk,
      hint: 'Upload a quotation for each vendor allocation',
    },
  ]
}

export function validateTransitionForFinalize(input: TransitionFinalizeInput): { ok: boolean; messages: string[] } {
  const messages: string[] = []
  const { clientPOs, selectedVersionId, draft } = input

  if (clientPOs.length === 0) {
    messages.push('At least one client PO is required.')
  }
  if (!selectedVersionId || !draft) {
    messages.push('Select a pitch version.')
    return { ok: false, messages }
  }

  const poVal = totalPOValue(clientPOs)
  if (poVal <= 0) {
    messages.push('Total PO value must be greater than zero.')
  }

  if (!transitionServiceValuesMatchPO(draft, clientPOs)) {
    messages.push('Service values must match total PO value.')
  }

  if (!transitionAllServicesHaveVendors(draft)) {
    messages.push('Each service with a value must have at least one vendor mapped.')
  }

  if (!transitionAllQuotationsUploaded(draft)) {
    messages.push('Each vendor allocation must have a quotation uploaded.')
  }

  const saveCheck = validateTransitionDraftForSave(draft)
  if (!saveCheck.ok) {
    messages.push(...saveCheck.messages)
  }

  return { ok: messages.length === 0, messages }
}

export function canFinalizeTransition(input: TransitionFinalizeInput): boolean {
  return validateTransitionForFinalize(input).ok
}

export type ServiceQuoteStatus = 'Uploaded' | 'Partial' | 'Missing'

/** Quote coverage for vendor rows with positive allocation on a service. */
export function serviceQuoteStatus(svc: PitchService): ServiceQuoteStatus {
  const rows = (svc.vendorMappings ?? []).filter((vm) => vm.value > 0)
  if (rows.length === 0) return 'Missing'
  const uploaded = rows.filter((vm) => Boolean(vm.quotation?.fileUrl && vm.quotation?.fileName))
  if (uploaded.length === rows.length) return 'Uploaded'
  if (uploaded.length === 0) return 'Missing'
  return 'Partial'
}
