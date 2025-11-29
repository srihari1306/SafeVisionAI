const API_BASE_URL = '/api'

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Important: Include cookies for session auth
    }
    
    const response = await fetch(url, config)
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw { response: { data: error }, status: response.status }
    }
    
    return response.json()
  }
  
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }
  
  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
  
  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }
  
  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }
}

export const api = new ApiService()