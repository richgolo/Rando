import { Link, Navigate, useLocation } from 'react-router-dom'
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
  if (role && profile.role !== role) {
    return (
      <Empty title="This page is not available for your account">
        <p className="muted">It is for {role}s only.</p>
        <Link className="btn" to="/">Go to my home page</Link>
      </Empty>
    )
  }
  return children
}
