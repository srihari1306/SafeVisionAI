import { useIncidentStore } from '../store/incidentStore'
import { AlertCircle, Camera, Smartphone, Clock } from 'lucide-react'

const STATUS_COLORS = {
  new: 'bg-red-100 text-red-800 border-red-300',
  acknowledged: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  dispatched: 'bg-blue-100 text-blue-800 border-blue-300',
  resolved: 'bg-green-100 text-green-800 border-green-300',
  false_alarm: 'bg-gray-100 text-gray-800 border-gray-300'
}

const SEVERITY_COLORS = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600'
}

export default function LiveAlerts() {
  const { incidents, selectIncident, selectedIncident } = useIncidentStore()
  
  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    // Show relative time if recent
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    
    // Otherwise show time
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <AlertCircle size={20} className="text-indigo-600" />
          Live Alerts
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {incidents.length} total incidents
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {incidents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <AlertCircle size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No incidents reported</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                onClick={() => selectIncident(incident)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedIncident?.id === incident.id ? 'bg-indigo-50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {incident.source === 'CCTV' ? (
                      <Camera size={18} className="text-gray-600" />
                    ) : (
                      <Smartphone size={18} className="text-gray-600" />
                    )}
                    <span className="font-medium text-gray-900">
                      Incident #{incident.id}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[incident.status]}`}>
                    {incident.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock size={14} />
                    <span>{formatTime(incident.occurred_at)}</span>
                  </div>
                  
                  {incident.severity && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Severity:</span>
                      <span className={`font-medium capitalize ${SEVERITY_COLORS[incident.severity]}`}>
                        {incident.severity}
                      </span>
                    </div>
                  )}
                  
                  {incident.camera_id && (
                    <div className="text-gray-500">
                      Camera: {incident.camera_id}
                    </div>
                  )}
                  
                  <div className="text-gray-500">
                    Location: {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}