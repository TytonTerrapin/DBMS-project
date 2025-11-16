import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { photoAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Upload() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadedPhoto, setUploadedPhoto] = useState(null)
  const [error, setError] = useState(null)
  

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }

      setSelectedFile(file)
      setError(null)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    
    if (!selectedFile) {
      setError('Please select a file')
      return
    }

    if (!title) {
      setError('Please enter a title')
      return
    }

    try {
      setUploading(true)
      setError(null)
      const token = await getToken()
      
      const metadata = {}
      if (title) metadata.title = title
      if (description) metadata.description = description

      const result = await photoAPI.uploadPhoto(token, selectedFile, metadata)
      setUploadedPhoto(result)
      
      // Reset form
      setSelectedFile(null)
      setPreview(null)
      setTitle('')
      setDescription('')
      
    } catch (err) {
      console.error('Upload failed:', err)
      setError(err.response?.data?.detail || 'Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreview(null)
    setTitle('')
    setDescription('')
    setUploadedPhoto(null)
    setError(null)
  }

  if (uploadedPhoto) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card text-center">
          <div className="mb-6">
            <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Upload Successful!</h2>
          <p className="mb-6" style={{ color: 'var(--muted)' }}>Your photo has been uploaded and analyzed by our AI models.</p>

          {/* Show uploaded photo details (no background strip) */}
          <div className="mb-6">
            {preview && (
              <img src={preview} alt="Uploaded" className="max-h-64 mx-auto mb-4" style={{ borderRadius: 'var(--radius)' }} />
            )}
            
            {uploadedPhoto.caption && (
              <div className="mb-4">
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Model Generated Caption:</p>
                <p className="italic" style={{ color: 'var(--text)' }}>"{uploadedPhoto.caption}"</p>
              </div>
            )}

            {uploadedPhoto.tags && uploadedPhoto.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Model Generated Tags:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {uploadedPhoto.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="chip"
                    >
                      {tag.name || tag}
                      {tag.confidence && (
                        <span className="ml-1 text-xs opacity-75">
                          ({Math.round(tag.confidence * 100)}%)
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 justify-center">
            <button onClick={handleReset} className="btn-primary">
              Upload Another
            </button>
            <button onClick={() => navigate('/gallery')} className="btn-secondary">
              View Gallery
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Upload Photo</h1>
        <p className="mt-2" style={{ color: 'var(--muted)' }}>Upload a photo and let Model automatically tag and caption it</p>
      </div>

      <form onSubmit={handleUpload} className="card">
        {error && (
          <div className="rounded-lg p-4 mb-6" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
            {error}
          </div>
        )}

        {/* File input */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            Select Photo
          </label>
          <div className="border-2 border-dashed p-8 text-center hover:border-primary-400 transition-colors" style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius)' }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
              disabled={uploading}
            />
            <label htmlFor="file-input" className="cursor-pointer">
              {preview ? (
                <div>
                  <img src={preview} alt="Preview" className="max-h-64 mx-auto mb-4" style={{ borderRadius: 'var(--radius)' }} />
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Click to change photo</p>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-12 w-12" style={{ color: 'var(--muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Optional fields */}
        <div className="mb-6">
          <label htmlFor="title" className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            Event Name (Required)
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            placeholder="Enter event name"
            disabled={uploading}
            required
          />
        </div>

        {/* Public opt-in removed */}

        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
            rows="3"
            placeholder="Add a description"
            disabled={uploading}
          />
        </div>

        {/* Submit button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={!selectedFile || uploading || !title}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Uploading & Analyzing...</span>
              </>
            ) : (
              'Upload Photo'
            )}
          </button>
          
          {selectedFile && !uploading && (
            <button type="button" onClick={handleReset} className="btn-secondary">
              Reset
            </button>
          )}
        </div>

        {uploading && (
          <p className="text-sm text-center mt-4" style={{ color: 'var(--muted)' }}>
            Please wait while we upload and analyze your photo with AI...
          </p>
        )}
      </form>
    </div>
  )
}
