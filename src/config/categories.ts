export interface Subcategory {
  id: string
  name: string
  allowCustomName?: boolean
}

export interface Category {
  id: string
  name: string
  subcategories: Subcategory[]
}

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-001',
    name: 'Design & Diligence',
    subcategories: [
      { id: 'sub-001', name: 'Interior Design' },
      { id: 'sub-002', name: 'Engineering Services' },
      { id: 'sub-003', name: 'Due Diligence' },
      { id: 'sub-004', name: 'Acoustic Consultancy' },
      { id: 'sub-005', name: 'Lighting Consultancy' },
      { id: 'sub-006', name: 'LEED Consultancy' },
      { id: 'sub-007', name: 'Kitchen Consultancy' },
      { id: 'sub-008', name: 'Local Approvals' },
      { id: 'sub-009', name: 'Other', allowCustomName: true },
    ],
  },
  {
    id: 'cat-002',
    name: 'Build Services',
    subcategories: [
      { id: 'sub-010', name: 'Build Services' },
      { id: 'sub-011', name: 'Other', allowCustomName: true },
    ],
  },
  {
    id: 'cat-003',
    name: 'Consultancy',
    subcategories: [
      { id: 'sub-012', name: 'Management Consultancy' },
      { id: 'sub-013', name: 'Technical Consultancy' },
      { id: 'sub-014', name: 'Other', allowCustomName: true },
    ],
  },
  {
    id: 'cat-004',
    name: 'Travel',
    subcategories: [
      { id: 'sub-015', name: 'Travel & Expenses' },
      { id: 'sub-016', name: 'Other', allowCustomName: true },
    ],
  },
]
