import { create } from 'zustand'
import { api } from '../services/api'

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,
  
  // Check if user is authenticated
  checkAuth: async () => {
    try {
      const response = await api.get('/auth/me')
      set({ user: response.user, loading: false, error: null })
    } catch (error) {
      set({ user: null, loading: false, error: null })
    }
  },
  
  // Login
  login: async (username, password) => {
    try {
      set({ loading: true, error: null })
      const response = await api.post('/auth/login', { username, password })
      set({ user: response.user, loading: false, error: null })
      return true
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Login failed', 
        loading: false 
      })
      return false
    }
  },
  
  // Logout
  logout: async () => {
    try {
      await api.post('/auth/logout')
      set({ user: null, error: null })
    } catch (error) {
      console.error('Logout error:', error)
      set({ user: null })
    }
  }
}))