import { create } from 'zustand'
import { api } from '../services/api'

export const useIncidentStore = create((set, get) => ({
  incidents: [],
  selectedIncident: null,
  loading: false,
  error: null,
  
  // Fetch all incidents
  fetchIncidents: async (filters = {}) => {
    try {
      set({ loading: true, error: null })
      const params = new URLSearchParams(filters)
      const response = await api.get(`/incidents?${params}`)
      set({ incidents: response.incidents, loading: false })
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to fetch incidents',
        loading: false 
      })
    }
  },
  
  // Fetch single incident with details
  fetchIncidentById: async (id) => {
    try {
      set({ loading: true, error: null })
      const response = await api.get(`/incidents/${id}`)
      set({ selectedIncident: response, loading: false })
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to fetch incident',
        loading: false 
      })
    }
  },
  
  // Take action on incident
  takeAction: async (incidentId, actionType, note = '') => {
    try {
      const response = await api.post(`/incidents/${incidentId}/action`, {
        action_type: actionType,
        note
      })
      
      // Update local state
      set(state => ({
        incidents: state.incidents.map(inc => 
          inc.id === incidentId ? response.incident : inc
        ),
        selectedIncident: state.selectedIncident?.id === incidentId 
          ? response.incident 
          : state.selectedIncident
      }))
      
      return true
    } catch (error) {
      set({ error: error.response?.data?.error || 'Action failed' })
      return false
    }
  },
  
  // Add new incident from WebSocket
  addIncident: (incident) => {
    set(state => {
      // Check if already exists
      const exists = state.incidents.some(inc => inc.id === incident.id)
      if (exists) return state // <-- prevent duplicate

      return {
        incidents: [incident, ...state.incidents]
      }
    })
  },
  
  // Update existing incident from WebSocket
  updateIncident: (updatedIncident) => {
    set(state => ({
      incidents: state.incidents.map(inc => 
        inc.id === updatedIncident.id ? updatedIncident : inc
      ),
      selectedIncident: state.selectedIncident?.id === updatedIncident.id 
        ? updatedIncident 
        : state.selectedIncident
    }))
  },
  
  // Select incident for detail view
  selectIncident: (incident) => {
    set({ selectedIncident: incident })
  },
  
  // Clear selection
  clearSelection: () => {
    set({ selectedIncident: null })
  }
}))