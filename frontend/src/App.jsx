import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/clerk-react'
import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import AdminNavbar from './components/AdminNavbar'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Gallery from './pages/Gallery'
import Explore from './pages/Explore'
import SignInPage from './pages/SignIn'
import SignUpPage from './pages/SignUp'
import { photoAPI } from './services/api'

function App() {
  const { isSignedIn, isLoaded } = useUser()
  const { getToken } = useAuth()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const NAV_HEIGHT = 72 // px, matches Navbar
  const [userRole, setUserRole] = useState(null)
  const [roleLoaded, setRoleLoaded] = useState(false)

  // Fetch user role when signed in
  useEffect(() => {
    const fetchUserRole = async () => {
      if (isSignedIn && isLoaded) {
        try {
          const token = await getToken()
          const userData = await photoAPI.getCurrentUser(token)
          setUserRole(userData.role)
        } catch (error) {
          console.error('Failed to fetch user role:', error)
          setUserRole(null)
        } finally {
          setRoleLoaded(true)
        }
      } else {
        setRoleLoaded(true)
      }
    }
    fetchUserRole()
  }, [isSignedIn, isLoaded, getToken])

  if (!isLoaded || (isSignedIn && !roleLoaded)) {
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

  // Conditionally render AdminNavbar for admin users
  const NavbarComponent = userRole === 'admin' ? AdminNavbar : Navbar

  return (
     <div className={`${isHome ? 'theme-editorial' : 'theme-muted-teal'} min-h-screen flex flex-col`}
        style={{ background: 'linear-gradient(180deg, var(--bg-start), var(--bg-end))' }}>
      <NavbarComponent />
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
