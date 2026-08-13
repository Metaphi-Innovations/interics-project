import client from '@/api/client'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import { INDIAN_STATES } from '@/constants/locations'

export type PincodeLocation = {
  pincode: string
  city: string
  state: string
}

function matchIndianState(apiState: string): string {
  const normalized = apiState.trim().toLowerCase()
  const found = INDIAN_STATES.find((state) => state.toLowerCase() === normalized)
  return found ?? apiState.trim()
}

export async function lookupPincodeLocation(pincode: string): Promise<PincodeLocation> {
  const res = await client.get(`/dropdowns/pincode/${pincode}`)
  const data = unwrapApiData<PincodeLocation>(res.data)
  return {
    pincode: data.pincode,
    city: data.city,
    state: matchIndianState(data.state),
  }
}
