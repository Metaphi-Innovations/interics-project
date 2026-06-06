import { DEFAULT_GST_RATE } from '@/config/billingRates'
import { computeGst } from '@/pages/Finance/components/InvoiceLineItems'
import type { PitchService, VendorMapping } from '@/slices/pitch/reducer'
import type { Service } from '@/slices/settings/reducer'

export function resolvePitchServiceGstRate(
  service: Pick<PitchService, 'gstRate' | 'subcategoryId'>,
  settingsServices: Service[],
): number {
  if (service.gstRate != null && !Number.isNaN(service.gstRate)) {
    return service.gstRate
  }
  const master = settingsServices.find((s) => s.id === service.subcategoryId)
  if (master?.gstRate != null) return master.gstRate
  return DEFAULT_GST_RATE
}

export function pitchServiceGstByUs(
  service: PitchService,
  settingsServices: Service[],
): number {
  if (service.gstByUs != null) return service.gstByUs
  const rate = resolvePitchServiceGstRate(service, settingsServices)
  return computeGst(service.value, rate)
}

export function pitchServiceGstByClient(service: PitchService): number {
  if (service.gstByClient != null) return service.gstByClient
  return 0
}

export function vendorMappingGstByUs(
  mapping: VendorMapping,
  service: PitchService,
  settingsServices: Service[],
): number {
  if (mapping.gstByUs != null) return mapping.gstByUs
  const rate =
    mapping.gstRate != null
      ? mapping.gstRate
      : resolvePitchServiceGstRate(service, settingsServices)
  return computeGst(mapping.value, rate)
}

export function vendorMappingGstByClient(mapping: VendorMapping): number {
  if (mapping.gstByClient != null) return mapping.gstByClient
  return 0
}
