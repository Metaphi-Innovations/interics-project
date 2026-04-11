import { http, HttpResponse } from 'msw'
import { DEFAULT_CATEGORIES } from '../../config/categories'

export const categoriesHandlers = [
  http.get('/api/categories', () => {
    return HttpResponse.json(DEFAULT_CATEGORIES)
  }),
]
