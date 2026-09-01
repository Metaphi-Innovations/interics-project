import { SearchableSelect, type SearchableSelectProps } from '@/components/listing'

export const SETTINGS_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const

type SettingsStatusSelectProps = Omit<SearchableSelectProps, 'options'>

export function SettingsStatusSelect(props: SettingsStatusSelectProps) {
  return <SearchableSelect {...props} options={[...SETTINGS_STATUS_OPTIONS]} />
}
