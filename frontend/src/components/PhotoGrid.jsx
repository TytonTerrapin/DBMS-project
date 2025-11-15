import PhotoCard from './PhotoCard'
import LoadingSpinner from './LoadingSpinner'

export default function PhotoGrid({ photos, loading, onDeletePhoto }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12" style={{ color: 'var(--muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium" style={{ color: 'var(--text)' }}>No photos</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Get started by uploading a photo.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} onDelete={onDeletePhoto} />
      ))}
    </div>
  )
}
