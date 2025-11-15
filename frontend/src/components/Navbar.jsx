import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUser, UserButton } from '@clerk/clerk-react'
import { useState } from 'react'

export default function Navbar() {
  const { isSignedIn } = useUser()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const useDashboard = !isHome
  const NAV_HEIGHT = 72 // px - used by App padding to avoid overlap
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    // Navigate to gallery with query param so Gallery can handle the search
    const q = (searchQuery || '').trim()
    if (!q) return
    navigate(`/explore?q=${encodeURIComponent(q)}`)
  }

  const navigate = useNavigate()

  return (
    <header
      className={`top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur-sm`}
      style={{
        // Position the navbar as an overlay so it visually blends with page hero
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        background: isHome
          ? 'linear-gradient(180deg, rgba(14,165,164,0.14) 0%, rgba(14,165,164,0.06) 25%, rgba(14,165,164,0.02) 45%, transparent 80%)'
          : 'linear-gradient(180deg, rgba(14,165,164,0.12) 0%, rgba(14,165,164,0.06) 25%, rgba(14,165,164,0.02) 45%, transparent 80%), var(--card)',
        // Remove the thin divider line under the navbar so it blends with the hero
        borderBottom: 'none',
        boxShadow: useDashboard ? 'var(--shadow)' : undefined,
        backdropFilter: 'saturate(120%) blur(4px)',
        // keep nav visually above page content
        zIndex: 40
      }}
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
      {/* Left: Logo and Brand */}
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-3" style={{ color: isHome ? 'rgba(255,255,255,0.98)' : 'var(--text)' }}>
          <div className="size-6" style={{ color: isHome ? 'rgba(235,250,249,0.95)' : 'var(--accent)' }}>
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path 
                clipRule="evenodd" 
                d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" 
                fill="currentColor" 
                fillRule="evenodd"
              />
            </svg>
          </div>
          <h2 className={`text-lg font-bold leading-tight tracking-[-0.015em] ${isHome ? 'text-white' : ''}`} style={isHome ? { textShadow: '0 1px 0 rgba(0,0,0,0.08)' } : {}}>CampusLens</h2>
        </Link>
      </div>

          {/* Center: Search Bar (only show when signed in) */}
          {isSignedIn && (
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <form onSubmit={handleSearch} className="flex flex-col w-full h-10">
                <div className="flex w-full flex-1 items-stretch h-full" style={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div className="flex items-center justify-center pl-4" style={{ color: 'var(--muted)', background: 'var(--card)' }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input 
                    className="flex w-full min-w-0 flex-1 px-4 text-sm outline-none" 
                    style={{ color: 'var(--text)', background: 'var(--card)' }}
                    placeholder="Search all photos..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
            </div>
          )}

      {/* Right: Navigation and User */}
      <div className="flex items-center gap-4">
        {isSignedIn ? (
          <>
            {/* Navigation Links - Hidden on mobile */}
            <div className="hidden lg:flex items-center gap-1">
              <Link 
                to="/dashboard" 
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  location.pathname === '/dashboard' 
                    ? 'underline decoration-2 underline-offset-4'
                    : 'hover:underline hover:decoration-2 hover:underline-offset-4'
                }`}
                style={{ 
                  color: location.pathname === '/dashboard' ? (isHome ? 'rgba(255,255,255,0.95)' : 'var(--accent)') : (isHome ? 'rgba(255,255,255,0.75)' : 'var(--muted)'),
                  borderRadius: 'var(--radius)'
                }}
              >
                Dashboard
              </Link>
              <Link 
                to="/gallery" 
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  location.pathname === '/gallery' 
                    ? 'underline decoration-2 underline-offset-4'
                    : 'hover:underline hover:decoration-2 hover:underline-offset-4'
                }`}
                style={{ 
                  color: location.pathname === '/gallery' ? (isHome ? 'rgba(255,255,255,0.95)' : 'var(--accent)') : (isHome ? 'rgba(255,255,255,0.75)' : 'var(--muted)'),
                  borderRadius: 'var(--radius)'
                }}
              >
                Gallery
              </Link>
              <Link
                to="/explore"
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  location.pathname === '/explore'
                    ? 'underline decoration-2 underline-offset-4'
                    : 'hover:underline hover:decoration-2 hover:underline-offset-4'
                }`}
                style={{
                  color: location.pathname === '/explore' ? (isHome ? 'rgba(255,255,255,0.95)' : 'var(--accent)') : (isHome ? 'rgba(255,255,255,0.75)' : 'var(--muted)'),
                  borderRadius: 'var(--radius)'
                }}
              >
                Explore
              </Link>
            </div>

            {/* Upload Button */}
            <Link 
              to="/upload"
              className={isHome ? "flex min-w-[84px] items-center justify-center h-10 px-4 py-2" : "btn-primary flex min-w-[84px] items-center justify-center h-10 px-5"}
              style={isHome ? { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 'var(--radius)' } : { background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius)' }}
            >
              <span className="truncate">Upload</span>
            </Link>

            {/* User Avatar */}
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10 rounded-full"
                }
              }}
            />
          </>
        ) : (
          <>
            <Link 
              to="/sign-in" 
              className="px-4 py-2 text-sm font-medium transition-colors hover:underline"
              style={{ color: isHome ? 'rgba(255,255,255,0.85)' : 'var(--muted)' }}
            >
              Sign In
            </Link>
            <Link 
              to="/sign-up"
              className={isHome ? "flex items-center justify-center h-10 px-4 py-2" : "btn-primary flex items-center justify-center h-10 px-5"}
              style={isHome ? { background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 'var(--radius)' } : { background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius)' }}
            >
              Sign Up
            </Link>
          </>
        )}
      </div>

  </div>

  {/* Mobile Navigation Menu */}
      {isSignedIn && (
        <div className={`lg:hidden fixed bottom-0 left-0 right-0 px-4 py-3 flex justify-around items-center z-50`} style={{ borderTop: isHome ? '1px solid rgba(255,255,255,0.06)' : '1px solid var(--border)', background: isHome ? 'transparent' : 'var(--card)' }}>
          <Link 
            to="/dashboard"
            className="flex flex-col items-center gap-1 px-3 py-2"
            style={{ 
              color: location.pathname === '/dashboard' ? 'var(--accent)' : 'var(--muted)',
              borderRadius: 'var(--radius)'
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Dashboard</span>
          </Link>
          <Link 
            to="/gallery"
            className="flex flex-col items-center gap-1 px-3 py-2"
            style={{ 
              color: location.pathname === '/gallery' ? 'var(--accent)' : 'var(--muted)',
              borderRadius: 'var(--radius)'
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">Gallery</span>
          </Link>
            <Link 
            to="/upload"
            className="flex flex-col items-center gap-1 px-3 py-2"
              style={{ 
              color: isHome ? 'white' : 'var(--accent)',
              background: isHome ? 'rgba(255,255,255,0.06)' : 'color-mix(in oklab, var(--accent) 10%, transparent)',
              borderRadius: 'var(--radius)'
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-xs font-medium">Upload</span>
          </Link>
            <Link 
                to="/explore"
                className="flex flex-col items-center gap-1 px-3 py-2"
                style={{ 
                  color: location.pathname === '/explore' ? 'var(--accent)' : 'var(--muted)',
                  borderRadius: 'var(--radius)'
                }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18v4H3V3zm0 7h18v11H3V10z" />
              </svg>
              <span className="text-xs font-medium">Explore</span>
            </Link>
        </div>
      )}
    </header>
  )
}
