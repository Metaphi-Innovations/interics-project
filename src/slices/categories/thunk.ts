import { createAsyncThunk } from '@reduxjs/toolkit'
import { categoriesApi } from '../../api/categoriesApi'
import { normalizeArrayResponse } from '@/utils/normalizeListResponse'
import type { Category } from '../../config/categories'

export const fetchCategories = createAsyncThunk(
  'categories/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await categoriesApi.getAll()
      return normalizeArrayResponse<Category>(response.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch categories')
    }
  }
)
