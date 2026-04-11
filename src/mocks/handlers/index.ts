import { authHandlers } from './authHandlers'
import { customersHandlers } from './customersHandlers'
import { vendorsHandlers } from './vendorsHandlers'
import { projectsHandlers } from './projectsHandlers'
import { pitchHandlers } from './pitchHandlers'
import { baselineHandlers } from './baselineHandlers'
import { usersHandlers } from './usersHandlers'
import { settingsHandlers } from './settingsHandlers'
import { categoriesHandlers } from './categoriesHandlers'
import { liveHandlers } from './liveHandlers'

export const handlers = [
  ...authHandlers,
  ...customersHandlers,
  ...vendorsHandlers,
  ...projectsHandlers,
  ...pitchHandlers,
  ...baselineHandlers,
  ...usersHandlers,
  ...settingsHandlers,
  ...categoriesHandlers,
  ...liveHandlers,
]
