import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Function to set auth token (will be called from components with Clerk token)
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

// API methods
export const photoAPI = {
  // Get current user info (including role)
  getCurrentUser: async (token) => {
    setAuthToken(token)
    const response = await api.get('/api/users/me')
    return response.data
  },

  // Get current user's photos
  getUserPhotos: async (token) => {
    setAuthToken(token)
    const response = await api.get('/api/users/me/photos')
    return response.data
  },

  // Get all photos (admin only, or with optional tag filter)
  getAllPhotos: async (token, tag = null) => {
    setAuthToken(token)
    const url = tag ? `/api/photos?tag=${encodeURIComponent(tag)}` : '/api/photos'
    const response = await api.get(url)
    return response.data
  },
  // Get explore (public, opt-in) photos (read-only gallery)
  getExplorePhotos: async (token, params = {}) => {
    setAuthToken(token)
    const qs = new URLSearchParams()
    if (params.q) qs.append('q', params.q)
    if (params.tag) qs.append('tag', params.tag)
    if (params.skip) qs.append('skip', params.skip)
    if (params.limit) qs.append('limit', params.limit)
    const url = `/api/photos/explore${qs.toString() ? `?${qs.toString()}` : ''}`
    const response = await api.get(url)
    return response.data
  },
  // (Explore removed) Use getAllPhotos or getUserPhotos instead.

  // Upload a new photo
  uploadPhoto: async (token, file, metadata = {}) => {
    setAuthToken(token)
    const formData = new FormData()
    formData.append('file', file)
    
    if (metadata.title) formData.append('title', metadata.title)
    if (metadata.description) formData.append('description', metadata.description)

    const response = await api.post('/api/photos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Delete a photo
  deletePhoto: async (token, photoId) => {
    setAuthToken(token)
    const response = await api.delete(`/api/photos/${photoId}`)
    return response.data
  },
}

export default api
