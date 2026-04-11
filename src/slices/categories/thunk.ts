import { createAsyncThunk } from '@reduxjs/toolkit'
import { categoriesApi } from '../../api/categoriesApi'
import type { Category } from '../../config/categories'

export const fetchCategories = createAsyncThunk(
  'categories/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await categoriesApi.getAll()
      return response.data as Category[]
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch categories')
    }
  }
)
