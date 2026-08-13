/** Frontend validation for Project Management Master forms. */

import { requiredAlphabeticName } from '@/modules/system-settings/shared/settings-validation'

export type ProjectManagementFormErrors = {
  name?: string
  checkpoints?: string
  checkpointErrors?: Array<{ name?: string }>
}

export function validateProjectManagementCategory(name: string): string | undefined {
  return requiredAlphabeticName(name, 'Category', 100)
}

export function validateProjectManagementForm(input: {
  name: string
  checkpoints: Array<{ name: string }>
}): ProjectManagementFormErrors {
  const errors: ProjectManagementFormErrors = {}
  const nameError = validateProjectManagementCategory(input.name)
  if (nameError) errors.name = nameError

  const checkpointErrors = input.checkpoints.map((cp) => {
    const row: { name?: string } = {}
    if (!cp.name.trim()) row.name = 'Checkpoint name is required.'
    return row
  })

  const seen = new Map<string, number>()
  input.checkpoints.forEach((cp, index) => {
    const key = cp.name.trim().toLowerCase()
    if (!key) return
    const firstIndex = seen.get(key)
    if (firstIndex === undefined) {
      seen.set(key, index)
      return
    }
    checkpointErrors[index] = {
      ...checkpointErrors[index],
      name: 'Checkpoint names must be unique.',
    }
  })

  const filled = input.checkpoints.filter((cp) => cp.name.trim())
  if (filled.length === 0) {
    errors.checkpoints = 'Add at least one checkpoint'
  }

  if (checkpointErrors.some((row) => row.name)) {
    errors.checkpointErrors = checkpointErrors
  }

  return errors
}
