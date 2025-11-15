import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import PhotoModal from '../components/PhotoModal'

export default function Explore() {
  const [photos, setPhotos] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  const loadPhotos = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/uploads/list.json')
      if (!res.ok) throw new Error(`Upload list fetch failed: ${res.status}`)
      const data = await res.json()
      // Normalize to the shape PhotoModal expects
      const normalized = (data || []).map(f => ({
        id: f.filename,
        file_path: f.url,
        title: f.filename,
        tags: [],
        uploaded_at: f.uploaded_at
      }))
      setPhotos(normalized)
    } catch (err) {
      console.error('Failed to load uploads:', err)
      setError(err.message || 'Failed to load uploads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPhotos() }, [])

  // If the page is opened with a query param ?q=..., populate the search box
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('q') || ''
    setSearchQuery(q)
  }, [location.search])

  // Filter photos by title (case-insensitive) based on searchQuery
  const filteredPhotos = useMemo(() => {
    if (!searchQuery) return photos
    const q = searchQuery.trim().toLowerCase()
    return photos.filter(p => (p.title || '').toLowerCase().includes(q))
  }, [photos, searchQuery])

  

  if (loading) return <div className="flex justify-center items-center py-20"><LoadingSpinner size="lg" /></div>

  return (
    <div className="flex-1 p-6 sm:p-8 lg:p-10 min-w-0">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-black leading-tight tracking-[-0.033em]" style={{ color: 'var(--text)' }}>
              Explore Photos
            </p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg p-4 mb-6" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>{error}</div>}

      <div className="mb-6">
        <div className="max-w-md">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--muted)' }}>Search photos</label>
          <input
            type="search"
            placeholder="Type to filter by title..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              // keep URL in sync so Navbar searches can link here
              const params = new URLSearchParams(location.search)
              if (e.target.value) params.set('q', e.target.value)
              else params.delete('q')
              navigate({ search: params.toString() }, { replace: true })
            }}
            className="input-field"
          />
        </div>
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🌐</div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>No public photos yet</h3>
          <p style={{ color: 'var(--muted)' }}>No files were found in the `uploads/` folder.</p>
        </div>
      ) : (
        <div className="masonry-grid">
          {photos.map(photo => (
            <div key={photo.id} className="masonry-grid-item group relative cursor-pointer overflow-hidden" style={{ borderRadius: 'var(--radius)' }} onClick={() => setSelectedPhoto(photo)}>
              <img
                className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                src={photo.file_path.startsWith('http') ? photo.file_path : `${window.location.origin}${photo.file_path}`}
                alt={photo.title || 'Photo'}
                onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage not found%3C/text%3E%3C/svg%3E' }}
              />

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <h3 className="text-white text-lg font-bold">{photo.title || 'Untitled'}</h3>
              </div>

              <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col gap-2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none group-hover:opacity-0 transition-opacity">
                {photo.tags && photo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {photo.tags.slice(0,3).map((tag, idx) => (
                      <span key={idx} className="text-xs font-medium text-white bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">{tag.name || tag}</span>
                    ))}
                    {photo.tags.length > 3 && <span className="text-xs font-medium text-white bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">+{photo.tags.length - 3}</span>}
                  </div>
                )}
                {photo.uploaded_at && (
                  <p className="text-xs text-white/80">{new Date(photo.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} readOnly={true} />
      )}
    </div>
  )
}

