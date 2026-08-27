import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { getDaysBetweenDates } from '@/utils/formatters'
import {
  buildProjectsStartEndCellModel,
  mergeProjectsDualDateColFilters,
  toProjectsDualDateFilterParams,
} from './projectsDatesCell'

describe('Projects Start/End Date cell model', () => {
  it('renders both start and end date texts', () => {
    const model = buildProjectsStartEndCellModel('2024-01-15', '2024-08-30')
    expect(model.startText).toMatch(/15/)
    expect(model.startText).toMatch(/Jan/)
    expect(model.startText).toMatch(/2024/)
    expect(model.endText).toMatch(/30/)
    expect(model.endText).toMatch(/Aug/)
    expect(model.endText).toMatch(/2024/)
  })

  it('includes duration inside the same cell model', () => {
    const model = buildProjectsStartEndCellModel('2024-01-15', '2024-08-30')
    expect(model.durationText).toBe('229 days')
  })

  it('same calendar day = 1 day', () => {
    expect(getDaysBetweenDates('2024-09-01', '2024-09-01')).toBe(1)
    expect(buildProjectsStartEndCellModel('2024-09-01', '2024-09-01').durationText).toBe('1 day')
  })

  it('multi-day inclusive duration is correct', () => {
    expect(getDaysBetweenDates('2024-09-01', '2024-09-02')).toBe(2)
    expect(getDaysBetweenDates('2024-09-01', '2024-09-15')).toBe(15)
    expect(buildProjectsStartEndCellModel('2024-09-01', '2024-09-02').durationText).toBe('2 days')
  })

  it('missing start = no duration', () => {
    const model = buildProjectsStartEndCellModel(null, '2024-08-30')
    expect(model.startText).toBe('—')
    expect(model.endText).toMatch(/30/)
    expect(model.durationText).toBeNull()
  })

  it('missing end = no duration', () => {
    const model = buildProjectsStartEndCellModel('2024-01-15', null)
    expect(model.startText).toMatch(/15/)
    expect(model.endText).toBe('—')
    expect(model.durationText).toBeNull()
  })

  it('end before start = no negative duration', () => {
    expect(getDaysBetweenDates('2024-09-15', '2024-09-01')).toBeNull()
    expect(buildProjectsStartEndCellModel('2024-09-15', '2024-09-01').durationText).toBeNull()
  })
})

describe('Projects dual-date funnel filter params', () => {
  it('start only sends expectedStartDate', () => {
    expect(toProjectsDualDateFilterParams('2024-01-15', '')).toEqual({
      expectedStartDate: '2024-01-15',
    })
  })

  it('end only sends expectedEndDate', () => {
    expect(toProjectsDualDateFilterParams('', '2024-08-30')).toEqual({
      expectedEndDate: '2024-08-30',
    })
  })

  it('both sends both values', () => {
    expect(toProjectsDualDateFilterParams('2024-01-15', '2024-08-30')).toEqual({
      expectedStartDate: '2024-01-15',
      expectedEndDate: '2024-08-30',
    })
  })

  it('reset clears both date filters', () => {
    const next = mergeProjectsDualDateColFilters(
      { expectedStartDate: '2024-01-15', expectedEndDate: '2024-08-30', status: 'Live' },
      '',
      '',
    )
    expect(next.expectedStartDate).toBe('')
    expect(next.expectedEndDate).toBe('')
    expect(next.status).toBe('Live')
    expect(toProjectsDualDateFilterParams('', '')).toEqual({})
  })
})

describe('Projects dual-date funnel page reset wiring', () => {
  const projectsPage = fs.readFileSync(path.resolve(__dirname, './ProjectsPage.tsx'), 'utf8')

  it('Apply resets page to 1 via onDualDateFilter → setPage(1) + refetch page 1', () => {
    expect(projectsPage).toContain('onDualDateFilter={(start, end) => {')
    expect(projectsPage).toMatch(
      /onDualDateFilter=\{\(start, end\) => \{[\s\S]*?dispatch\(setPage\(1\)\)[\s\S]*?refetch\(\{[\s\S]*?page:\s*1/,
    )
  })

  it('Reset clears both filters through the same dual apply path (page → 1)', () => {
    expect(projectsPage).toContain('mergeProjectsDualDateColFilters(prev, start, end)')
    expect(projectsPage).toContain("colFilters: { expectedStartDate: start, expectedEndDate: end }")
  })
})

describe('ColumnFilterPopover dual-date opt-in + single-date regression', () => {
  const popoverSrc = fs.readFileSync(
    path.resolve(__dirname, '../../components/listing/ColumnFilterPopover.tsx'),
    'utf8',
  )
  const headerSrc = fs.readFileSync(
    path.resolve(__dirname, '../../components/listing/FilterableSortHeader.tsx'),
    'utf8',
  )
  const projectsPage = fs.readFileSync(path.resolve(__dirname, './ProjectsPage.tsx'), 'utf8')
  const expensesPage = fs.readFileSync(
    path.resolve(__dirname, '../Finance/ExpensesPage.tsx'),
    'utf8',
  )

  it('supports opt-in dual-date mode with Reset + Apply and two independent drafts', () => {
    expect(popoverSrc).toContain("mode: 'dual-date'")
    expect(popoverSrc).toContain('draftStart')
    expect(popoverSrc).toContain('draftEnd')
    expect(popoverSrc).toContain('label="Reset"')
    expect(popoverSrc).toContain('onApplyDual')
    expect(popoverSrc).toContain('Expected Start Date')
    expect(popoverSrc).toContain('Expected End Date')
  })

  it('keeps existing single-date mode Apply/Cancel intact', () => {
    expect(popoverSrc).toContain("mode === 'date'")
    expect(popoverSrc).toContain('label="Cancel"')
    expect(popoverSrc).toContain('applyDate')
    expect(popoverSrc).toMatch(/isDate \?[\s\S]*?label="Apply"/)
  })

  it('FilterableSortHeader dual-date is opt-in and default remains options/date', () => {
    expect(headerSrc).toContain("filterMode: 'dual-date'")
    expect(headerSrc).toContain("filterMode?: 'options' | 'date'")
    expect(headerSrc).toContain('filterDualValue')
    expect(headerSrc).toContain('onFilterDual')
  })

  it('Projects uses one Start / End Date column with dual-date funnel', () => {
    expect(projectsPage).toContain('label="Start / End Date"')
    expect(projectsPage).toContain('filterMode="dual-date"')
    expect(projectsPage).not.toContain('label="Start Date"')
    expect(projectsPage).not.toContain('label="End Date"')
    expect(projectsPage).toContain('buildProjectsStartEndCellModel')
  })

  it('Expenses continues using single-date ColumnFilterPopover mode', () => {
    expect(expensesPage).toContain('filterMode="date"')
    expect(expensesPage).not.toContain('filterMode="dual-date"')
  })
})
