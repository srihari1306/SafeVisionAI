import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useIncidentStore } from '../store/incidentStore'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in React-Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

// Custom marker icons based on status
const createCustomIcon = (status) => {
  const colors = {
    new: '#ef4444',
    acknowledged: '#f59e0b',
    dispatched: '#3b82f6',
    resolved: '#10b981',
    false_alarm: '#6b7280'
  }
  
  const color = colors[status] || colors.new
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 12px;
      ">
        !
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

export default function MapView() {
  const { incidents, selectIncident } = useIncidentStore()
  
  // Default center (Chennai, India)
  const defaultCenter = [13.0827, 80.2707]
  
  // Calculate center based on incidents
  const mapCenter = incidents.length > 0
    ? [incidents[0].lat, incidents[0].lng]
    : defaultCenter
  
  return (
    <div className="h-full w-full">
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.lat, incident.lng]}
            icon={createCustomIcon(incident.status)}
            eventHandlers={{
              click: () => selectIncident(incident)
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold mb-1">Incident #{incident.id}</h3>
                <p className="text-sm text-gray-600">Source: {incident.source}</p>
                <p className="text-sm text-gray-600">Status: {incident.status}</p>
                {incident.severity && (
                  <p className="text-sm text-gray-600">
                    Severity: <span className="capitalize">{incident.severity}</span>
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg z-10">
        <h4 className="font-semibold mb-2 text-sm">Status Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span>New</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span>Acknowledged</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span>Dispatched</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>Resolved</span>
          </div>
        </div>
      </div>
    </div>
  )
}