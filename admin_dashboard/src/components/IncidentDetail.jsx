// import { useEffect, useState } from 'react'
// import { useIncidentStore } from '../store/incidentStore'
// import { X, Check, Truck, XCircle, Camera, Clock, MapPin, Activity } from 'lucide-react'
// import SensorChart from './SensorChart'

// const API_BASE = '/api'

// export default function IncidentDetail({ incident }) {
//   const { clearSelection, takeAction, fetchIncidentById } = useIncidentStore()
//   const [detailedIncident, setDetailedIncident] = useState(incident)
//   const [actionNote, setActionNote] = useState('')
//   const [loading, setLoading] = useState(false)
  
//   useEffect(() => {
//     // Fetch full incident details with action logs
//     const loadDetails = async () => {
//       const data = await fetchIncidentById(incident.id)
//       if (data) {
//         setDetailedIncident(data)
//       }
//     }
//     loadDetails()
//   }, [incident.id, fetchIncidentById])
  
//   const handleAction = async (actionType) => {
//     setLoading(true)
//     const success = await takeAction(incident.id, actionType, actionNote)
//     setActionNote('')
//     setLoading(false)
    
//     if (success) {
//       // Refresh details
//       const updated = await fetchIncidentById(incident.id)
//       if (updated) {
//         setDetailedIncident(updated)
//       }
//     }
//   }
  
//   const formatDateTime = (dateStr) => {
//     const date = new Date(dateStr)
//     return date.toLocaleString('en-US', {
//       month: 'short',
//       day: 'numeric',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: true
//     })
//   }
  
//   return (
//     <div className="h-full flex flex-col">
//       {/* Header */}
//       <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
//         <h2 className="text-lg font-semibold text-gray-900">
//           Incident #{incident.id}
//         </h2>
//         <button
//           onClick={clearSelection}
//           className="p-1 hover:bg-gray-200 rounded transition-colors"
//         >
//           <X size={20} />
//         </button>
//       </div>
      
//       {/* Content */}
//       <div className="flex-1 overflow-y-auto p-4 space-y-6">
//         {/* Media */}
//         {detailedIncident.media && detailedIncident.media.length > 0 && (
//           <div className="space-y-2">
//             <h3 className="font-semibold text-gray-900 flex items-center gap-2">
//               <Camera size={18} />
//               Media
//             </h3>
//             {detailedIncident.media.map((media) => (
//               <div key={media.id}>
//                 {media.media_type === 'snapshot' && (
//                   <img
//                     src={`${API_BASE}/incidents/media/${media.id}`}
//                     alt="Incident snapshot"
//                     className="w-full rounded-lg border border-gray-200"
//                   />
//                 )}
//                 {media.media_type === 'video' && (
//                   <video
//                     controls
//                     className="w-full rounded-lg border border-gray-200"
//                     src={`${API_BASE}/incidents/media/${media.id}`}
//                   />
//                 )}
//               </div>
//             ))}
//           </div>
//         )}
        
//         {/* Basic Info */}
//         <div className="space-y-3">
//           <h3 className="font-semibold text-gray-900">Details</h3>
          
//           <div className="space-y-2 text-sm">
//             <div className="flex items-start gap-2">
//               <MapPin size={16} className="text-gray-500 mt-0.5" />
//               <div>
//                 <p className="text-gray-500">Location</p>
//                 <p className="font-medium">{incident.lat.toFixed(6)}, {incident.lng.toFixed(6)}</p>
//               </div>
//             </div>
            
//             <div className="flex items-start gap-2">
//               <Clock size={16} className="text-gray-500 mt-0.5" />
//               <div>
//                 <p className="text-gray-500">Occurred At</p>
//                 <p className="font-medium">{formatDateTime(incident.occurred_at)}</p>
//               </div>
//             </div>
            
//             <div className="flex items-start gap-2">
//               <Activity size={16} className="text-gray-500 mt-0.5" />
//               <div>
//                 <p className="text-gray-500">Status</p>
//                 <p className="font-medium capitalize">{incident.status.replace('_', ' ')}</p>
//               </div>
//             </div>
            
//             {incident.camera_id && (
//               <div>
//                 <p className="text-gray-500">Camera ID</p>
//                 <p className="font-medium">{incident.camera_id}</p>
//               </div>
//             )}
            
//             {incident.confidence && (
//               <div>
//                 <p className="text-gray-500">AI Confidence</p>
//                 <p className="font-medium">{(incident.confidence * 100).toFixed(1)}%</p>
//               </div>
//             )}
            
//             {incident.severity && (
//               <div>
//                 <p className="text-gray-500">Severity</p>
//                 <p className="font-medium capitalize">{incident.severity}</p>
//               </div>
//             )}
//           </div>
//         </div>
        
//         {/* Mobile Sensor Data */}
//         {detailedIncident.mobile_report && (
//           <div className="space-y-3">
//             <h3 className="font-semibold text-gray-900">Mobile Sensor Data</h3>
//             <div className="grid grid-cols-3 gap-3 text-sm">
//               <div className="p-3 bg-red-50 rounded-lg">
//                 <p className="text-gray-600 text-xs">Acceleration Peak</p>
//                 <p className="font-bold text-red-700">
//                   {detailedIncident.mobile_report.acc_peak?.toFixed(2)} g
//                 </p>
//               </div>
//               <div className="p-3 bg-blue-50 rounded-lg">
//                 <p className="text-gray-600 text-xs">Gyro Peak</p>
//                 <p className="font-bold text-blue-700">
//                   {detailedIncident.mobile_report.gyro_peak?.toFixed(1)}°/s
//                 </p>
//               </div>
//               <div className="p-3 bg-yellow-50 rounded-lg">
//                 <p className="text-gray-600 text-xs">Speed</p>
//                 <p className="font-bold text-yellow-700">
//                   {detailedIncident.mobile_report.speed?.toFixed(0)} km/h
//                 </p>
//               </div>
//             </div>
            
//             {/* Sensor Chart */}
//             <SensorChart mobileReport={detailedIncident.mobile_report} />
//           </div>
//         )}
        
//         {/* Action Logs */}
//         {detailedIncident.action_logs && detailedIncident.action_logs.length > 0 && (
//           <div className="space-y-2">
//             <h3 className="font-semibold text-gray-900">Action History</h3>
//             <div className="space-y-2">
//               {detailedIncident.action_logs.map((log) => (
//                 <div key={log.id} className="p-3 bg-gray-50 rounded-lg text-sm">
//                   <div className="flex justify-between items-start mb-1">
//                     <span className="font-medium capitalize">
//                       {log.action_type.replace('_', ' ')}
//                     </span>
//                     <span className="text-gray-500 text-xs">
//                       {formatDateTime(log.created_at)}
//                     </span>
//                   </div>
//                   <p className="text-gray-600">By: {log.username}</p>
//                   {log.note && <p className="text-gray-700 mt-1">{log.note}</p>}
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}
        
//         {/* Action Section */}
//         {incident.status !== 'resolved' && incident.status !== 'false_alarm' && (
//           <div className="space-y-3">
//             <h3 className="font-semibold text-gray-900">Take Action</h3>
            
//             <textarea
//               value={actionNote}
//               onChange={(e) => setActionNote(e.target.value)}
//               placeholder="Add notes (optional)..."
//               className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
//               rows="3"
//             />
            
//             <div className="grid grid-cols-2 gap-2">
//               {incident.status === 'new' && (
//                 <button
//                   onClick={() => handleAction('acknowledge')}
//                   disabled={loading}
//                   className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 text-sm font-medium"
//                 >
//                   <Check size={16} />
//                   Acknowledge
//                 </button>
//               )}
              
//               {(incident.status === 'new' || incident.status === 'acknowledged') && (
//                 <button
//                   onClick={() => handleAction('dispatch')}
//                   disabled={loading}
//                   className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
//                 >
//                   <Truck size={16} />
//                   Dispatch
//                 </button>
//               )}
              
//               <button
//                 onClick={() => handleAction('resolve')}
//                 disabled={loading}
//                 className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm font-medium"
//               >
//                 <Check size={16} />
//                 Resolve
//               </button>
              
//               <button
//                 onClick={() => handleAction('false_alarm')}
//                 disabled={loading}
//                 className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 text-sm font-medium"
//               >
//                 <XCircle size={16} />
//                 False Alarm
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }
import { useEffect, useState } from 'react'
import { useIncidentStore } from '../store/incidentStore'
import { X, Check, Truck, XCircle, Camera, Clock, MapPin, Activity } from 'lucide-react'
import SensorChart from './SensorChart'

const API_BASE = '/api'

export default function IncidentDetail({ incident }) {
  const { clearSelection, takeAction, fetchIncidentById } = useIncidentStore()
  const [detailedIncident, setDetailedIncident] = useState(incident)
  const [actionNote, setActionNote] = useState('')
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    // Fetch full incident details with action logs
    let cancelled = false
    
    const loadDetails = async () => {
      const data = await fetchIncidentById(incident.id)
      if (data && !cancelled) {
        setDetailedIncident(data)
      }
    }
    loadDetails()
    
    return () => {
      cancelled = true
    }
  }, [incident.id, fetchIncidentById])
  
  const handleAction = async (actionType) => {
    setLoading(true)
    const success = await takeAction(incident.id, actionType, actionNote)
    setActionNote('')
    setLoading(false)
    
    if (success) {
      // Refresh details
      const updated = await fetchIncidentById(incident.id)
      if (updated) {
        setDetailedIncident(updated)
      }
    }
  }
  
  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">
          Incident #{incident.id}
        </h2>
        <button
          onClick={clearSelection}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Media */}
        {detailedIncident.media && detailedIncident.media.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Camera size={18} />
              Media
            </h3>
            {detailedIncident.media.map((media) => (
              <div key={media.id}>
                {media.media_type === 'snapshot' && (
                  <img
                    src={`${API_BASE}/incidents/media/${media.id}`}
                    alt="Incident snapshot"
                    className="w-full rounded-lg border border-gray-200"
                  />
                )}
                {media.media_type === 'video' && (
                  <video
                    controls
                    className="w-full rounded-lg border border-gray-200"
                    src={`${API_BASE}/incidents/media/${media.id}`}
                  />
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Basic Info */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Details</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-gray-500 mt-0.5" />
              <div>
                <p className="text-gray-500">Location</p>
                <p className="font-medium">{incident.lat.toFixed(6)}, {incident.lng.toFixed(6)}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Clock size={16} className="text-gray-500 mt-0.5" />
              <div>
                <p className="text-gray-500">Occurred At</p>
                <p className="font-medium">{formatDateTime(incident.occurred_at)}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Activity size={16} className="text-gray-500 mt-0.5" />
              <div>
                <p className="text-gray-500">Status</p>
                <p className="font-medium capitalize">{incident.status.replace('_', ' ')}</p>
              </div>
            </div>
            
            {incident.camera_id && (
              <div>
                <p className="text-gray-500">Camera ID</p>
                <p className="font-medium">{incident.camera_id}</p>
              </div>
            )}
            
            {incident.confidence && (
              <div>
                <p className="text-gray-500">AI Confidence</p>
                <p className="font-medium">{(incident.confidence * 100).toFixed(1)}%</p>
              </div>
            )}
            
            {incident.severity && (
              <div>
                <p className="text-gray-500">Severity</p>
                <p className="font-medium capitalize">{incident.severity}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile Sensor Data */}
        {detailedIncident.mobile_report && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Mobile Sensor Data</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-gray-600 text-xs">Acceleration Peak</p>
                <p className="font-bold text-red-700">
                  {detailedIncident.mobile_report.acc_peak?.toFixed(2)} g
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-gray-600 text-xs">Gyro Peak</p>
                <p className="font-bold text-blue-700">
                  {detailedIncident.mobile_report.gyro_peak?.toFixed(1)}°/s
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-gray-600 text-xs">Speed</p>
                <p className="font-bold text-yellow-700">
                  {detailedIncident.mobile_report.speed?.toFixed(0)} km/h
                </p>
              </div>
            </div>
            
            {/* Sensor Chart */}
            <SensorChart mobileReport={detailedIncident.mobile_report} />
          </div>
        )}
        
        {/* Action Logs */}
        {detailedIncident.action_logs && detailedIncident.action_logs.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Action History</h3>
            <div className="space-y-2">
              {detailedIncident.action_logs.map((log) => (
                <div key={log.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium capitalize">
                      {log.action_type.replace('_', ' ')}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-600">By: {log.username}</p>
                  {log.note && <p className="text-gray-700 mt-1">{log.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Action Section */}
        {incident.status !== 'resolved' && incident.status !== 'false_alarm' && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Take Action</h3>
            
            <textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Add notes (optional)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows="3"
            />
            
            <div className="grid grid-cols-2 gap-2">
              {incident.status === 'new' && (
                <button
                  onClick={() => handleAction('acknowledge')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 text-sm font-medium"
                >
                  <Check size={16} />
                  Acknowledge
                </button>
              )}
              
              {(incident.status === 'new' || incident.status === 'acknowledged') && (
                <button
                  onClick={() => handleAction('dispatch')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
                >
                  <Truck size={16} />
                  Dispatch
                </button>
              )}
              
              <button
                onClick={() => handleAction('resolve')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm font-medium"
              >
                <Check size={16} />
                Resolve
              </button>
              
              <button
                onClick={() => handleAction('false_alarm')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 text-sm font-medium"
              >
                <XCircle size={16} />
                False Alarm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}