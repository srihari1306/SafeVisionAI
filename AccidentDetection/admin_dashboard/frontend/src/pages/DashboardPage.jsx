import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useIncidentStore } from '../store/incidentStore'
import { socketService } from '../services/socket'
import Header from '../components/Header'
import LiveAlerts from '../components/LiveAlerts'
import MapView from '../components/MapView'
import IncidentDetail from '../components/IncidentDetail'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { 
    fetchIncidents, 
    addIncident, 
    updateIncident, 
    selectedIncident 
  } = useIncidentStore()
  
  useEffect(() => {
    // Fetch initial incidents
    fetchIncidents()
    
    // Connect to WebSocket
    socketService.connect()
    
    // Listen for new incidents
    socketService.on('new_incident', (data) => {
      console.log('New incident received:', data)
      addIncident(data)
      
      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('New Accident Detected', {
          body: `${data.source} incident at ${data.lat}, ${data.lng}`,
          icon: '/alert-icon.png'
        })
      }
    })
    
    // Listen for incident updates
    socketService.on('incident_update', (data) => {
      console.log('Incident updated:', data)
      updateIncident(data.incident)
    })
    
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
    
    // Cleanup on unmount
    return () => {
      socketService.disconnect()
    }
  }, [fetchIncidents, addIncident, updateIncident])
  
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header user={user} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Live Alerts */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <LiveAlerts />
        </div>
        
        {/* Center: Map View */}
        <div className="flex-1 relative">
          <MapView />
        </div>
        
        {/* Right Panel: Incident Detail (conditionally shown) */}
        {selectedIncident && (
          <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
            <IncidentDetail incident={selectedIncident} />
          </div>
        )}
      </div>
    </div>
  )
}