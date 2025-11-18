import { useEffect, useState } from 'react'

export default function PhotoModal({ photo, onClose, onDelete, readOnly = false, onNavigate }) {
  const [isZoomed, setIsZoomed] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

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
    setIsAnimating(true)
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    if (!onNavigate) return
    
    const handleKeyNav = (e) => {
      if (e.key === 'ArrowLeft') onNavigate('prev')
      if (e.key === 'ArrowRight') onNavigate('next')
    }
    window.addEventListener('keydown', handleKeyNav)
    return () => window.removeEventListener('keydown', handleKeyNav)
  }, [onNavigate])

  const imageUrl = photo.file_path?.startsWith('http') 
    ? photo.file_path 
    : `${window.location.origin}${photo.file_path}`

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = photo.title || 'photo.jpg'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const toggleZoom = () => {
    setIsZoomed(!isZoomed)
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'bg-green-500'
    if (confidence >= 0.7) return 'bg-yellow-400'
    return 'bg-orange-400'
  }

  const getConfidencePercentage = (confidence) => {
    return confidence ? Math.round(confidence * 100) : 0
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Backdrop with glassmorphism */}
      <div 
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{ 
          background: 'rgba(7, 17, 36, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}
        onClick={onClose}
      />

      {/* Navigation Arrows */}
      {onNavigate && (
        <>
          <button
            onClick={() => onNavigate('prev')}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200"
            style={{
              background: 'rgba(14, 165, 164, 0.15)',
              border: '1px solid rgba(14, 165, 164, 0.3)',
              color: 'var(--accent)',
              backdropFilter: 'blur(8px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(14, 165, 164, 0.25)'
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(14, 165, 164, 0.15)'
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => onNavigate('next')}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200"
            style={{
              background: 'rgba(14, 165, 164, 0.15)',
              border: '1px solid rgba(14, 165, 164, 0.3)',
              color: 'var(--accent)',
              backdropFilter: 'blur(8px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(14, 165, 164, 0.25)'
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(14, 165, 164, 0.15)'
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Modal Container with glassmorphism and animation */}
      <div 
        className={`relative z-50 flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden md:flex-row transition-all duration-300 ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        style={{ 
          borderRadius: 'var(--radius)', 
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(14, 165, 164, 0.1)',
          background: 'rgba(7, 17, 36, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(234, 248, 247, 0.08)'
        }}
      >
        {/* Close Button with better visibility */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200"
          style={{ 
            background: 'rgba(14, 165, 164, 0.15)',
            border: '1px solid rgba(14, 165, 164, 0.3)',
            color: 'var(--accent)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(14, 165, 164, 0.3)'
            e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(14, 165, 164, 0.15)'
            e.currentTarget.style.transform = 'rotate(0deg) scale(1)'
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image Section with glow and rounded corners */}
        <div className="flex flex-1 items-center justify-center p-8 md:p-12" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
          <img
            src={imageUrl}
            alt={photo.title || 'Photo'}
            className={`max-h-full max-w-full object-contain transition-all duration-300 cursor-pointer ${isZoomed ? 'scale-150' : 'scale-100'}`}
            style={{
              borderRadius: 'var(--radius)',
              boxShadow: '0 0 40px rgba(14, 165, 164, 0.3), 0 0 80px rgba(14, 165, 164, 0.15)',
              border: '2px solid rgba(14, 165, 164, 0.2)'
            }}
            onClick={toggleZoom}
            onError={(e) => {
              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage not found%3C/text%3E%3C/svg%3E'
            }}
          />
        </div>

        {/* Details Sidebar with refined spacing */}
        <div 
          className="w-full md:w-[400px] flex-shrink-0 flex flex-col" 
          style={{ 
            borderLeft: '1px solid rgba(234, 248, 247, 0.1)', 
            background: 'rgba(7, 17, 36, 0.5)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {/* Title Section */}
            <div className="pb-6" style={{ borderBottom: '1px solid rgba(234, 248, 247, 0.08)' }}>
              <h1 className="text-3xl font-bold leading-tight mb-2" style={{ color: 'var(--text)' }}>
                {photo.title || 'Untitled Photo'}
              </h1>
              {photo.uploaded_at && (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {new Date(photo.uploaded_at).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              )}
            </div>

            {/* Description Section */}
            {photo.description && (
              <div className="pb-6" style={{ borderBottom: '1px solid rgba(234, 248, 247, 0.08)' }}>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>
                  Description
                </h2>
                <p className="text-base leading-relaxed" style={{ color: 'var(--text)' }}>
                  {photo.description}
                </p>
              </div>
            )}

            {/* AI Generated Caption Section */}
            {photo.caption && (
              <div className="pb-6" style={{ borderBottom: '1px solid rgba(234, 248, 247, 0.08)' }}>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>
                  AI Generated Caption
                </h2>
                <p className="text-base leading-relaxed italic" style={{ color: 'var(--muted)' }}>
                  {photo.caption}
                </p>
              </div>
            )}

            {/* AI Detected Tags Section */}
            {photo.tags && photo.tags.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--accent)' }}>
                  AI Detected Tags
                </h2>

                <div className="flex gap-2 flex-wrap">
                  {photo.tags.map((tag, idx) => {
                    const tagName = tag.name || tag

                    return (
                      <div 
                        key={idx}
                        className="tag-pill-enhanced"
                      >
                        <p className="text-sm font-medium leading-normal" style={{ color: 'var(--text)' }}>
                          {tagName}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div 
            className="flex items-center gap-3 p-6" 
            style={{ 
              borderTop: '1px solid rgba(234, 248, 247, 0.1)', 
              background: 'rgba(7, 17, 36, 0.6)'
            }}
          >
            <button 
              onClick={handleDownload}
              className="btn-modal-action flex-1"
              style={{ 
                background: 'var(--accent)',
                color: 'white'
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            <button 
              onClick={onClose}
              className="btn-modal-action flex-1"
              style={{ 
                background: 'rgba(234, 248, 247, 0.05)',
                border: '1px solid rgba(234, 248, 247, 0.1)',
                color: 'var(--text)'
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
            {!readOnly && onDelete && (
              <button 
                onClick={() => {
                  onDelete(photo.id)
                  onClose()
                }}
                className="btn-modal-action flex-none"
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--danger)'
                }}
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
