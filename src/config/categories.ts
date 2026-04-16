export interface Subcategory {
  id: string
  name: string
  sacCode: string
  gstRate: number
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
      { id: 'sub-001', name: 'Interior Design', sacCode: '998391', gstRate: 18 },
      { id: 'sub-002', name: 'Engineering Services', sacCode: '998392', gstRate: 18 },
      { id: 'sub-003', name: 'Due Diligence', sacCode: '998393', gstRate: 18 },
      { id: 'sub-004', name: 'LEED (Planning)', sacCode: '998312', gstRate: 18 },
      { id: 'sub-005', name: 'Local Approvals', sacCode: '999799', gstRate: 18 },
    ],
  },
  {
    id: 'cat-002',
    name: 'Build Services',
    subcategories: [
      { id: 'sub-010', name: 'Construction / Build Services', sacCode: '995411', gstRate: 18 },
      { id: 'sub-011', name: 'Interior Execution / Fit-outs', sacCode: '995481', gstRate: 18 },
      { id: 'sub-012', name: 'Project Management / Site Supervision', sacCode: '998319', gstRate: 18 },
    ],
  },
  {
    id: 'cat-003',
    name: 'Consultancy',
    subcategories: [
      { id: 'sub-020', name: 'Acoustic Consultancy', sacCode: '998312', gstRate: 18 },
      { id: 'sub-021', name: 'Lighting Consultancy', sacCode: '998312', gstRate: 18 },
      { id: 'sub-022', name: 'Kitchen Consultancy', sacCode: '998312', gstRate: 18 },
      { id: 'sub-023', name: 'LEED (Advisory)', sacCode: '998312', gstRate: 18 },
    ],
  },
]
