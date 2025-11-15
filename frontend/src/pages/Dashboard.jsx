import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import { photoAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import PhotoModal from '../components/PhotoModal'

export default function Dashboard() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  useEffect(() => {
    loadUserAndPhotos()
  }, [])

  const loadUserAndPhotos = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      
      // First, get user info to check role
      const userData = await photoAPI.getCurrentUser(token)
      setUserRole(userData.role)
      
      // Load photos based on role
      let data
      if (userData.role === 'admin') {
        // Admin sees all photos
        data = await photoAPI.getAllPhotos(token)
      } else {
        // Regular user sees only their photos
        data = await photoAPI.getUserPhotos(token)
      }
      setPhotos(data)
    } catch (err) {
      console.error('Failed to load photos:', err)
      setError(err.response?.data?.detail || 'Failed to load photos')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return
    
    try {
      const token = await getToken()
      await photoAPI.deletePhoto(token, photoId)
      setPhotos(photos.filter(p => p.id !== photoId))
    } catch (err) {
      console.error('Failed to delete photo:', err)
      alert('Failed to delete photo: ' + (err.response?.data?.detail || err.message))
    }
  }

  const filteredPhotos = photos.filter(photo => 
    photo.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    photo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    photo.caption?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const firstName = user?.firstName || 'User'

  return (
    <div className="flex w-full">
      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-8 lg:p-10 min-w-0">
        {/* Page Heading */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-3xl sm:text-4xl font-black leading-tight tracking-[-0.033em]" style={{ color: 'var(--text)' }}>
                Welcome, {firstName}! {userRole === 'admin' && <span style={{ color: 'var(--accent)' }}>(Admin)</span>}
              </p>
              <p className="text-base font-normal leading-normal" style={{ color: 'var(--muted)' }}>
                {userRole === 'admin' 
                  ? "Here's an overview of all photos in the system."
                  : "Ready to add more memories? Here's your photo collection."}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg p-4 mb-6" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : photos.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>No photos yet</h3>
            <p className="mb-6" style={{ color: 'var(--muted)' }}>Get started by uploading your first photo.</p>
            <Link to="/upload" className="btn-primary inline-flex items-center justify-center">
              Upload Photo
            </Link>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="mb-6 max-w-md">
              <label className="flex flex-col w-full h-10">
                <div className="flex w-full flex-1 items-stretch h-full" style={{ borderRadius: 'var(--radius)' }}>
                  <div className="flex items-center justify-center pl-4 border-r-0" style={{ color: 'var(--muted)', background: 'var(--card)', borderTopLeftRadius: 'var(--radius)', borderBottomLeftRadius: 'var(--radius)' }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input 
                    className="input-field flex-1 !pl-2 !rounded-l-none border-l-0" 
                    placeholder="Search photos..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </label>
            </div>

            {/* Masonry Photo Grid */}
            <div className="masonry-grid">
              {filteredPhotos.map((photo) => (
                <PhotoMasonryCard 
                  key={photo.id} 
                  photo={photo} 
                  onDelete={handleDeletePhoto}
                  onClick={() => setSelectedPhoto(photo)}
                />
              ))}
            </div>

            {filteredPhotos.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <p style={{ color: 'var(--muted)' }}>No photos found matching "{searchQuery}"</p>
              </div>
            )}
          </>
        )}

        {/* Photo Detail Modal */}
        {selectedPhoto && (
          <PhotoModal
            photo={selectedPhoto}
            onClose={() => setSelectedPhoto(null)}
            onDelete={handleDeletePhoto}
          />
        )}
      </main>
    </div>
  )
}

function PhotoMasonryCard({ photo, onDelete, onClick }) {
  const imageUrl = photo.file_path?.startsWith('http') 
    ? photo.file_path 
    : `${window.location.origin}${photo.file_path}`

  return (
    <div 
      className="masonry-grid-item group relative cursor-pointer overflow-hidden"
      onClick={onClick}
      style={{ borderRadius: 'var(--radius)' }}
    >
      <img 
        className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105" 
        src={imageUrl}
        alt={photo.title || 'Photo'}
        onError={(e) => {
          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage not found%3C/text%3E%3C/svg%3E'
        }}
      />
      
      {/* Hover overlay with title */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
        <h3 className="text-white text-lg font-bold">{photo.title || 'Untitled'}</h3>
      </div>

      {/* Bottom gradient with tags and date */}
      <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col gap-2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none group-hover:opacity-0 transition-opacity">
        {photo.tags && photo.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photo.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="text-xs font-medium text-white bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                {tag.name || tag}
              </span>
            ))}
            {photo.tags.length > 3 && (
              <span className="text-xs font-medium text-white bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                +{photo.tags.length - 3}
              </span>
            )}
          </div>
        )}
        {photo.uploaded_at && (
          <p className="text-xs text-white/80">
            {new Date(photo.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete(photo.id)
        }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white p-2 shadow-lg"
        style={{ borderRadius: 'var(--radius)' }}
        title="Delete photo"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
