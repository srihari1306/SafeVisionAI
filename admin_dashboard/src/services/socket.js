import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.listeners = new Map()
  }
  
  connect() {
    if (this.socket?.connected) return
    
    // Connect to Flask-SocketIO
    // Session cookie is automatically sent with connection
    this.socket = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    })
    
    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket.id)
    })
    
    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })
    
    this.socket.on('connection_status', (data) => {
      console.log('Connection status:', data)
    })
    
    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
    })
    
    // Re-register all listeners after reconnection
    this.socket.on('connect', () => {
      this.listeners.forEach((callback, event) => {
        this.socket.on(event, callback)
      })
    })
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.listeners.clear()
    }
  }
  
  on(event, callback) {
    if (!this.socket) {
      console.warn('Socket not connected. Call connect() first.')
      return
    }
    
    // Store listener for re-registration on reconnect
    this.listeners.set(event, callback)
    this.socket.on(event, callback)
  }
  
  off(event) {
    if (this.socket) {
      this.socket.off(event)
      this.listeners.delete(event)
    }
  }
  
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('Socket not connected')
    }
  }
}

export const socketService = new SocketService()