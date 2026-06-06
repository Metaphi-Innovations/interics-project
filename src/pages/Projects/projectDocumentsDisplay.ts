import type { Project, ProjectDocumentFile } from '../../slices/projects/reducer'
import { formatDate } from '../../utils/formatters'
import { parseHttpUrl } from './projectCreateHelpers'

export interface ProjectDocumentColumnRow {
  id: string
  name: string
  typeLabel: string
  uploadedBy: string
  dateStr: string
  sizeStr: string | null
  isUpload: boolean
  blobUrl?: string
  fileName?: string
  canDelete: boolean
  onView: () => void
  onDownload?: () => void
  /** When set, the name renders as an external link. */
  href?: string
}

export interface ProjectDocumentSection {
  title: string
  rows: ProjectDocumentColumnRow[]
}

/** Canonical Create Project → Project Documents categories. */
export const PROJECT_DOCUMENT_CATEGORY_TITLES = [
  'Final Layout',
  'Final RCP',
  'Final Views',
  'Final Photographs',
  'Final Handover Documents',
] as const

export type ProjectDocumentCategoryTitle = (typeof PROJECT_DOCUMENT_CATEGORY_TITLES)[number]

const HANDOVER_SECTION_TITLE: ProjectDocumentCategoryTitle = 'Final Handover Documents'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileToRow(
  file: ProjectDocumentFile,
  typeLabel: string,
  rowId: string,
): ProjectDocumentColumnRow {
  return {
    id: rowId,
    name: file.fileName,
    typeLabel,
    uploadedBy: 'System',
    dateStr: formatDate(file.uploadedAt),
    sizeStr: formatBytes(file.sizeBytes),
    isUpload: false,
    blobUrl: file.blobUrl,
    fileName: file.fileName,
    canDelete: false,
    onView: () => window.open(file.blobUrl, '_blank', 'noopener,noreferrer'),
    onDownload: () => {
      const a = document.createElement('a')
      a.href = file.blobUrl
      a.download = file.fileName
      a.click()
    },
  }
}

function linkToRow(
  rowId: string,
  url: string,
  description: string | undefined,
  projectCreatedAt: string,
): ProjectDocumentColumnRow {
  const label = description?.trim() && description.trim() !== url ? description.trim() : url
  return {
    id: rowId,
    name: label,
    typeLabel: 'Link',
    uploadedBy: 'System',
    dateStr: formatDate(projectCreatedAt),
    sizeStr: null,
    isUpload: false,
    canDelete: false,
    href: url,
    onView: () => window.open(url, '_blank', 'noopener,noreferrer'),
  }
}

function notesOnlyRow(
  rowId: string,
  notes: string,
  projectCreatedAt: string,
): ProjectDocumentColumnRow {
  return {
    id: rowId,
    name: notes.trim(),
    typeLabel: 'Notes',
    uploadedBy: 'System',
    dateStr: formatDate(projectCreatedAt),
    sizeStr: null,
    isUpload: false,
    canDelete: false,
    onView: () => {},
  }
}

interface CategorySource {
  title: ProjectDocumentCategoryTitle
  link?: string
  description?: string
  file?: ProjectDocumentFile
  extraFiles?: ProjectDocumentFile[]
}

function rowsForCategory(
  key: string,
  source: CategorySource,
  projectCreatedAt: string,
): ProjectDocumentColumnRow[] {
  const rows: ProjectDocumentColumnRow[] = []
  const desc = source.description?.trim()
  const url = source.link?.trim() || (desc ? parseHttpUrl(desc) : undefined)

  if (url) {
    rows.push(linkToRow(`project-doc-link-${key}`, url, desc, projectCreatedAt))
  } else if (desc) {
    rows.push(notesOnlyRow(`project-doc-notes-${key}`, desc, projectCreatedAt))
  }

  if (source.file) {
    rows.push(fileToRow(source.file, 'Uploaded file', `project-doc-file-${key}-${source.file.id}`))
  }

  for (const file of source.extraFiles ?? []) {
    rows.push(
      fileToRow(file, 'Uploaded file', `project-doc-file-${key}-${file.id}`),
    )
  }

  return rows
}

function categorySourcesFromDocs(docs: NonNullable<Project['projectDocuments']>): CategorySource[] {
  const handoverFiles: ProjectDocumentFile[] = []
  const seen = new Set<string>()
  const pushHandover = (f: ProjectDocumentFile | undefined) => {
    if (!f || seen.has(f.id)) return
    seen.add(f.id)
    handoverFiles.push(f)
  }
  pushHandover(docs.finalHandoverFile)
  for (const f of docs.finalHandoverDocuments ?? []) {
    pushHandover(f)
  }

  return [
    {
      title: 'Final Layout',
      link: docs.finalLayoutLink,
      description: docs.finalLayoutDescription,
      file: docs.finalLayoutFile,
    },
    {
      title: 'Final RCP',
      link: docs.finalRcpLink,
      description: docs.finalRcpDescription,
      file: docs.finalRcpFile,
    },
    {
      title: 'Final Views',
      link: docs.finalViewsLink,
      description: docs.finalViewsDescription,
      file: docs.finalViewsFile,
    },
    {
      title: 'Final Photographs',
      link: docs.finalPhotographsLink,
      description: docs.finalPhotographsDescription,
      file: docs.finalPhotographsFile,
    },
    {
      title: 'Final Handover Documents',
      link: docs.finalHandoverLink,
      description: docs.finalHandoverDescription,
      extraFiles: handoverFiles,
    },
  ]
}

export interface BuildProjectDocumentSectionsOptions {
  /** When true, always return all five category sections (including empty tables). */
  alwaysShowSections?: boolean
}

/** Prefer persisted projectDocuments from detail fetch, then list cache after create. */
export function resolveProjectForDocuments(
  project: Project,
  listItems: Project[],
): Project {
  if (project.projectDocuments) return project
  const listed = listItems.find((p) => p.id === project.id)
  if (!listed?.projectDocuments) return project
  return { ...project, projectDocuments: listed.projectDocuments }
}

/** Build per-category document sections from persisted project create data. */
export function buildProjectDocumentSections(
  project: Project,
  options?: BuildProjectDocumentSectionsOptions,
): ProjectDocumentSection[] {
  const alwaysShow = options?.alwaysShowSections ?? false
  const docs = project.projectDocuments
  const createdAt = project.createdAt

  const categories = docs ? categorySourcesFromDocs(docs) : []

  const built = (categories.length > 0 ? categories : []).map((cat) => ({
    title: cat.title,
    rows: rowsForCategory(
      cat.title.toLowerCase().replace(/\s+/g, '-'),
      cat,
      createdAt,
    ),
  }))

  const byTitle = new Map(built.map((s) => [s.title, s]))

  const sections = PROJECT_DOCUMENT_CATEGORY_TITLES.map((title) => {
    const existing = byTitle.get(title)
    return existing ?? { title, rows: [] }
  })

  if (alwaysShow) return sections

  return sections.filter((section) => section.rows.length > 0)
}

/** Attach legacy Internal-tab uploads to Final Handover Documents. */
export function mergeLegacyInternalUploadRows(
  sections: ProjectDocumentSection[],
  legacyRows: ProjectDocumentColumnRow[],
): ProjectDocumentSection[] {
  if (legacyRows.length === 0) return sections

  return sections.map((section) =>
    section.title === HANDOVER_SECTION_TITLE
      ? { ...section, rows: [...section.rows, ...legacyRows] }
      : section,
  )
}

export function countProjectDocumentRows(sections: ProjectDocumentSection[]): number {
  return sections.reduce((sum, s) => sum + s.rows.length, 0)
}

export function filterProjectDocumentSectionsBySearch(
  sections: ProjectDocumentSection[],
  search: string,
  matchesSearch: (text: string, q: string) => boolean,
): ProjectDocumentSection[] {
  const q = search
  return sections.map((section) => ({
    ...section,
    rows: section.rows.filter((row) =>
      matchesSearch(`${row.name} ${row.typeLabel} ${section.title}`, q),
    ),
  }))
}
