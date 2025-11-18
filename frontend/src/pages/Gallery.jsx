import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import { photoAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import PhotoModal from '../components/PhotoModal'

export default function Gallery() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [photos, setPhotos] = useState([])
  const [filteredPhotos, setFilteredPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])
  const [allTags, setAllTags] = useState([])
  const [userRole, setUserRole] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  useEffect(() => {
    loadUserAndPhotos()
  }, [])

  // Read `q` param from URL (e.g., /gallery?q=mountain) and set searchQuery
  const location = useLocation()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('q') || ''
    if (q && q !== searchQuery) {
      setSearchQuery(q)
    }
  }, [location.search])

  useEffect(() => {
    let filtered = photos

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(photo => 
        photo.tags?.some(tag => selectedTags.includes(tag.name || tag))
      )
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(photo =>
        photo.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.tags?.some(tag => (tag.name || tag).toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Sort photos
    if (sortBy === 'recent') {
      filtered = [...filtered].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
    } else if (sortBy === 'oldest') {
      filtered = [...filtered].sort((a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at))
    } else if (sortBy === 'title') {
      filtered = [...filtered].sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    }

    setFilteredPhotos(filtered)
  }, [selectedTags, photos, searchQuery, sortBy])

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
      
      // Extract unique tags
      const tags = new Set()
      data.forEach(photo => {
        photo.tags?.forEach(tag => {
          tags.add(tag.name || tag)
        })
      })
      setAllTags(Array.from(tags).sort())
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

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const firstName = user?.firstName || 'User'

  return (
    <div className="flex w-full max-w-screen-2xl mx-auto">
      {/* Sidebar Filter Panel */}
      {allTags.length > 0 && (
        <aside className="sticky top-[69px] h-[calc(100vh-69px)] w-72 flex-shrink-0 p-6 hidden lg:block overflow-y-auto" style={{ borderRight: '1px solid var(--border)' }}>
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] mb-4" style={{ color: 'var(--text)' }}>
                Filter &amp; Sort
              </h2>
              <label className="flex flex-col min-w-40 h-11 w-full">
                <div className="flex w-full flex-1 items-stretch h-full" style={{ borderRadius: 'var(--radius)' }}>
                  <div className="flex items-center justify-center pl-3 border-r-0" style={{ color: 'var(--muted)', background: 'var(--card)', borderTopLeftRadius: 'var(--radius)', borderBottomLeftRadius: 'var(--radius)' }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input 
                    className="input-field flex-1 !pl-2 !rounded-l-none border-l-0" 
                    placeholder="Filter current view..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </label>
            </div>

            {/* Top Tags */}
            <div>
              <h3 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>Top Tags</h3>
              <div className="flex flex-col gap-2">
                {allTags.slice(0, 10).map((tag) => (
                  <label key={tag} className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={selectedTags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                      className="form-checkbox size-4 border-none rounded focus:ring-2"
                      style={{ 
                        color: 'var(--accent)',
                        background: 'var(--card)',
                        accentColor: 'var(--accent)'
                      }}
                    />
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{tag}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sort by */}
            <div>
              <h3 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>Sort by</h3>
              <div className="relative">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-field w-full appearance-none pr-10"
                  style={{ background: '#ffffff', color: '#0f1724' }}
                >
                  <option value="recent">Most Recent</option>
                  <option value="oldest">Oldest</option>
                  <option value="title">Title A-Z</option>
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: '#0f1724' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Active filters */}
            {selectedTags.length > 0 && (
              <div>
                <h3 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>Active Filters</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="chip"
                    >
                      {tag}
                      <span className="text-sm">×</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedTags([])}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--muted)' }}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-8 lg:p-10 min-w-0">
        {/* Page Heading */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-3xl sm:text-4xl font-black leading-tight tracking-[-0.033em]" style={{ color: 'var(--text)' }}>
                {firstName}'s Gallery {userRole === 'admin' && <span style={{ color: 'var(--accent)' }}>(Admin)</span>}
              </p>
              <p className="text-base font-normal leading-normal" style={{ color: 'var(--muted)' }}>
                {userRole === 'admin'
                  ? 'Browse and search through all photos in the system'
                  : 'Browse and search through all your photos'}
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
            <p style={{ color: 'var(--muted)' }}>Upload photos to see them here.</p>
          </div>
        ) : (
          <>
            {/* Mobile search (shown when sidebar is hidden) */}
            {allTags.length > 0 && (
              <div className="mb-6 lg:hidden">
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
            )}

            {/* Results count */}
            <div className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
              Showing {filteredPhotos.length} of {photos.length} photos
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

            {filteredPhotos.length === 0 && (searchQuery || selectedTags.length > 0) && (
              <div className="text-center py-12">
                <p style={{ color: 'var(--muted)' }}>No photos found matching your filters</p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedTags([])
                  }}
                  className="mt-4 hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  Clear all filters
                </button>
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
            onNavigate={(direction) => {
              const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id)
              if (direction === 'prev' && currentIndex > 0) {
                setSelectedPhoto(filteredPhotos[currentIndex - 1])
              } else if (direction === 'next' && currentIndex < filteredPhotos.length - 1) {
                setSelectedPhoto(filteredPhotos[currentIndex + 1])
              }
            }}
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
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity btn-floating-danger"
        style={{ borderRadius: '9999px' }}
        title="Delete photo"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
