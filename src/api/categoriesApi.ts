import client from './client'

export const categoriesApi = {
  getAll: () => client.get('/categories'),
}
