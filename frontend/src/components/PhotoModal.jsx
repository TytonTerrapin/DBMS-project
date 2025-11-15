import { useEffect } from 'react'

export default function PhotoModal({ photo, onClose, onDelete, readOnly = false }) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const imageUrl = photo.file_path?.startsWith('http') 
    ? photo.file_path 
    : `${window.location.origin}${photo.file_path}`

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'bg-green-500'
    if (confidence >= 0.7) return 'bg-yellow-400'
    return 'bg-orange-400'
  }

  const getConfidencePercentage = (confidence) => {
    return confidence ? Math.round(confidence * 100) : 0
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-50 flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden md:flex-row" style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', background: 'var(--card)' }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white transition-colors hover:bg-black/40"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image Section */}
        <div className="flex flex-1 items-center justify-center bg-black/80 p-4 md:p-8">
          <img
            src={imageUrl}
            alt={photo.title || 'Photo'}
            className="max-h-full max-w-full object-contain"
            onError={(e) => {
              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage not found%3C/text%3E%3C/svg%3E'
            }}
          />
        </div>

        {/* Details Sidebar */}
        <div className="w-full md:w-[380px] flex-shrink-0 flex flex-col" style={{ borderLeft: '1px solid var(--border)', background: 'var(--card)' }}>
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--text)' }}>
                {photo.title || 'Untitled Photo'}
              </h1>
              {photo.uploaded_at && (
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  {new Date(photo.uploaded_at).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              )}
            </div>

            {/* Description */}
            {photo.description && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                  Description
                </h2>
                <p className="text-base font-normal leading-relaxed" style={{ color: 'var(--text)' }}>
                  {photo.description}
                </p>
              </div>
            )}

            {/* AI Generated Caption */}
            {photo.caption && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                  AI Generated Caption
                </h2>
                <p className="text-base font-normal leading-relaxed italic" style={{ color: 'var(--muted)' }}>
                  {photo.caption}
                </p>
              </div>
            )}

            {/* AI Detected Tags - only render when tags are present */}
            {photo.tags && photo.tags.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
                  AI Detected Tags
                </h2>

                <div className="flex gap-2 flex-wrap">
                  {photo.tags.map((tag, idx) => {
                    const tagName = tag.name || tag
                    const confidence = tag.confidence || 0
                    const confidencePercent = getConfidencePercentage(confidence)

                    return (
                      <div 
                        key={idx}
                        className="tag-pill group relative"
                      >
                        {confidence > 0 && (
                          <span className={`h-2 w-2 rounded-full ${getConfidenceColor(confidence)}`} />
                        )}
                        <p className="text-sm font-medium leading-normal" style={{ color: 'var(--text)' }}>
                          {tagName}
                        </p>
                        {confidence > 0 && (
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" style={{ background: 'var(--text)' }}>
                            {confidencePercent}% confidence
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 p-4 lg:p-6" style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}>
            <button 
              onClick={onClose}
              className="btn-primary modal-btn flex-1"
              style={{ borderRadius: 'var(--radius)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Close
            </button>
            {!readOnly && onDelete && (
              <button 
                onClick={() => {
                  onDelete(photo.id)
                  onClose()
                }}
                className="btn-ghost-danger modal-btn flex-none"
                style={{ borderRadius: 'var(--radius)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
