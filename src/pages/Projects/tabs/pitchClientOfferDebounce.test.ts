import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const pitchTab = fs.readFileSync(
  path.resolve(__dirname, './PitchTab.tsx'),
  'utf8',
)

describe('Pitch Client Offer debounce', () => {
  it('debounces draft service row persistence with LISTING_SEARCH_DEBOUNCE_MS', () => {
    expect(pitchTab).toContain('function scheduleDraftServiceSave')
    expect(pitchTab).toContain('draftSaveTimersRef')
    expect(pitchTab).toContain('draftSaveSeqRef')
    expect(pitchTab).toContain('LISTING_SEARCH_DEBOUNCE_MS')
    expect(pitchTab).toContain('scheduleDraftServiceSave(category, patch)')
  })

  it('uses scheduleDraftServiceSave for draft amount and service changes', () => {
    expect(pitchTab).toMatch(/if \(isDraft\) \{[\s\S]*?scheduleDraftServiceSave\(category, patch\)/)
    expect(pitchTab).toMatch(
      /if \(isDraft\) \{[\s\S]*?scheduleDraftServiceSave\(category, \{ value \}\)/,
    )
    expect(pitchTab).not.toMatch(/void persistDraftServiceRow\(category, \{ value \}\)/)
  })

  it('keeps explicit Add Category / Add Service as immediate actions', () => {
    expect(pitchTab).toContain('async function addCategoryFromMaster')
    expect(pitchTab).toContain('async function addServiceRow')
    expect(pitchTab).not.toMatch(/debounce[\s\S]*addCategoryFromMaster/)
  })
})
