import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { Empty, Loading } from '../components/ui'

// Hides pages from the wrong users. This is only for a nicer experience:
// the REAL protection is the row-level security in the database.
export default function RequireRole({ role, children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading />
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  if (!profile) {
    return (
      <Empty title="Your profile could not be loaded">
        <p className="muted">Try signing out and in again. If it continues, contact support.</p>
      </Empty>
    )
  }
  // A page for the other role (e.g. an old link): go to this user's own home page instead.
  if (role && profile.role !== role) return <Navigate to="/" replace />
  return children
}
