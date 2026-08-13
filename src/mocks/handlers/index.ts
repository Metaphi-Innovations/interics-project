import { authHandlers } from './authHandlers'
import { projectsHandlers } from './projectsHandlers'
import { settingsHandlers } from './settingsHandlers'
import { categoriesHandlers } from './categoriesHandlers'
export const handlers = [
  ...authHandlers,
  // Customers, Vendors, Projects, Pitch, Live finance, Invoices, and Compliance use the real backend.
  ...projectsHandlers,
  ...settingsHandlers,
  ...categoriesHandlers,
]
