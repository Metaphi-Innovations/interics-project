import { authHandlers } from './authHandlers'
import { projectsHandlers } from './projectsHandlers'
import { settingsHandlers } from './settingsHandlers'
import { categoriesHandlers } from './categoriesHandlers'
import { complianceHandlers } from './complianceHandlers'

export const handlers = [
  ...authHandlers,
  // Customers, Vendors, Projects, Pitch, Live finance, and Invoices use the real backend.
  ...projectsHandlers,
  ...settingsHandlers,
  ...categoriesHandlers,
  ...complianceHandlers,
]
