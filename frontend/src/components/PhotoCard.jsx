import { useState } from 'react'

export default function PhotoCard({ photo, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(photo.id)
    } catch (error) {
      console.error('Delete failed:', error)
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Build full image URL
  const imageUrl = photo.file_path?.startsWith('http') 
    ? photo.file_path 
    : `${window.location.origin}${photo.file_path}`

  return (
    <div className="card group relative overflow-hidden transition-transform hover:scale-105">
      {/* Image */}
      <div className="aspect-square overflow-hidden bg-gray-100" style={{ borderRadius: 'var(--radius)' }}>
        <img
          src={imageUrl}
          alt={photo.title || 'Photo'}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage not found%3C/text%3E%3C/svg%3E'
          }}
        />
      </div>

      {/* Info */}
      <div className="mt-3">
        {photo.title && (
          <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{photo.title}</h3>
        )}
        {photo.caption && (
          <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--muted)' }}>{photo.caption}</p>
        )}
        
        {/* Tags */}
        {photo.tags && photo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {photo.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="chip"
              >
                {tag.name || tag}
              </span>
            ))}
            {photo.tags.length > 3 && (
              <span className="text-xs" style={{ color: 'var(--muted)' }}>+{photo.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Uploaded date */}
        {photo.uploaded_at && (
          <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
            {new Date(photo.uploaded_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Delete button */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 hover:bg-red-700 text-white p-2 shadow-lg transition-colors"
            style={{ borderRadius: 'var(--radius)' }}
            title="Delete photo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        ) : (
          <div className="p-2 space-x-1" style={{ background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs font-medium disabled:opacity-50"
              style={{ borderRadius: 'var(--radius)' }}
            >
              {isDeleting ? 'Deleting...' : 'Confirm'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
