import { authHandlers } from './authHandlers'
import { customersHandlers } from './customersHandlers'
import { vendorsHandlers } from './vendorsHandlers'
import { projectsHandlers } from './projectsHandlers'
import { pitchHandlers } from './pitchHandlers'
import { baselineHandlers } from './baselineHandlers'
import { usersHandlers } from './usersHandlers'
import { rolesHandlers } from './rolesHandlers'
import { settingsHandlers } from './settingsHandlers'
import { categoriesHandlers } from './categoriesHandlers'
import { liveHandlers } from './liveHandlers'
import { receivablesHandlers } from './receivablesHandlers'
import { payablesHandlers } from './payablesHandlers'
import { complianceHandlers } from './complianceHandlers'

export const handlers = [
  ...authHandlers,
  ...customersHandlers,
  ...vendorsHandlers,
  ...projectsHandlers,
  ...pitchHandlers,
  ...baselineHandlers,
  ...usersHandlers,
  ...rolesHandlers,
  ...settingsHandlers,
  ...categoriesHandlers,
  ...liveHandlers,
  ...receivablesHandlers,
  ...payablesHandlers,
  ...complianceHandlers,
]
