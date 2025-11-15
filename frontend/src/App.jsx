import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Gallery from './pages/Gallery'
import Explore from './pages/Explore'
import SignInPage from './pages/SignIn'
import SignUpPage from './pages/SignUp'

function App() {
  const { isSignedIn, isLoaded } = useUser()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const NAV_HEIGHT = 72 // px, matches Navbar

  if (!isLoaded) {
    return (
      <div className={`${isHome ? 'theme-editorial' : 'theme-muted-teal'} min-h-screen flex items-center justify-center`}
           style={{ background: 'linear-gradient(180deg, var(--bg-start), var(--bg-end))' }}>
        <div
          className="h-10 w-10 rounded-full border-2 border-[color:var(--accent)] border-b-transparent animate-spin"
          aria-label="Loading"
        />
      </div>
    )
  }

  return (
     <div className={`${isHome ? 'theme-editorial' : 'theme-muted-teal'} min-h-screen flex flex-col`}
        style={{ background: 'linear-gradient(180deg, var(--bg-start), var(--bg-end))' }}>
      <Navbar />
      <main className="flex-1" style={{ paddingTop: isHome ? 0 : `${NAV_HEIGHT}px` }}>
        <Routes>
          {/* Public routes */}
          <Route
            path="/"
            element={isSignedIn ? <Navigate to="/dashboard" replace /> : <Home />}
          />
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/gallery" element={<Gallery />} />
          </Route>
          <Route path="/explore" element={<Explore />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
