import client from './client'

export const settingsApi = {
  getCompanyProfile: () => client.get('/settings/company'),
  updateCompanyProfile: (data: Record<string, unknown>) =>
    client.put('/settings/company', data),

  getGSTRates: () => client.get('/settings/gst-rates'),
  createGSTRate: (data: Record<string, unknown>) =>
    client.post('/settings/gst-rates', data),
  updateGSTRate: (id: string, data: Record<string, unknown>) =>
    client.put(`/settings/gst-rates/${id}`, data),
  toggleGSTRateStatus: (id: string) =>
    client.patch(`/settings/gst-rates/${id}/toggle`),

  getTDSSections: () => client.get('/settings/tds-sections'),
  createTDSSection: (data: Record<string, unknown>) =>
    client.post('/settings/tds-sections', data),
  updateTDSSection: (id: string, data: Record<string, unknown>) =>
    client.put(`/settings/tds-sections/${id}`, data),
  toggleTDSSectionStatus: (id: string) =>
    client.patch(`/settings/tds-sections/${id}/toggle`),

  getSACCodes: () => client.get('/settings/sac-codes'),
  createSACCode: (data: Record<string, unknown>) =>
    client.post('/settings/sac-codes', data),
  updateSACCode: (id: string, data: Record<string, unknown>) =>
    client.put(`/settings/sac-codes/${id}`, data),
  toggleSACCodeStatus: (id: string) =>
    client.patch(`/settings/sac-codes/${id}/toggle`),

  getCategories: () => client.get('/settings/categories'),
  createCategory: (data: Record<string, unknown>) =>
    client.post('/settings/categories', data),
  updateCategory: (id: string, data: Record<string, unknown>) =>
    client.put(`/settings/categories/${id}`, data),
  toggleCategoryStatus: (id: string) =>
    client.patch(`/settings/categories/${id}/toggle`),
  deleteCategory: (id: string) =>
    client.delete(`/settings/categories/${id}`),

  getServices: () => client.get('/settings/services'),
  createService: (data: Record<string, unknown>) =>
    client.post('/settings/services', data),
  updateService: (id: string, data: Record<string, unknown>) =>
    client.put(`/settings/services/${id}`, data),
  toggleServiceStatus: (id: string) =>
    client.patch(`/settings/services/${id}/toggle`),

  getNumberingSchemes: () => client.get('/settings/numbering-schemes'),
  updateNumberingSchemes: (data: Record<string, unknown>) =>
    client.put('/settings/numbering-schemes', data),

  getSystemDefaults: () => client.get('/settings/system-defaults'),
  updateSystemDefaults: (data: Record<string, unknown>) =>
    client.put('/settings/system-defaults', data),
}
