import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import Icon from './Icon'
import logo from '../assets/logo-header.png'

const NAV = {
  farmer: [
    { to: '/farmer', label: 'My requests', icon: 'list', end: true },
    { to: '/farmer/new', label: 'New request', icon: 'plus' },
  ],
  transporter: [
    { to: '/transporter', label: 'Find loads', icon: 'search', end: true },
    { to: '/transporter/jobs', label: 'My jobs', icon: 'briefcase' },
    { to: '/transporter/vehicles', label: 'Vehicles', icon: 'truck' },
  ],
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

export default function Layout() {
  const { user, profile, loading, signOut } = useAuth()
  const links = profile ? NAV[profile.role] : []

  return (
    <div className={`app ${profile ? 'has-nav' : ''}`}>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <img src={logo} alt="FarmHaul" className="brand-logo" />
          </Link>

          {profile && (
            <nav className="nav-desktop" aria-label="Main">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end}>
                  <Icon name={l.icon} size={18} />
                  {l.label}
                </NavLink>
              ))}
            </nav>
          )}

          {!loading && !user && (
            <div className="topbar-actions">
              <Link className="btn btn-ghost btn-small" to="/signin">Sign in</Link>
              <Link className="btn btn-primary btn-small" to="/signup">Create account</Link>
            </div>
          )}

          {profile && (
            <div className="user-chip">
              <span className="avatar" aria-hidden="true">{initials(profile.full_name)}</span>
              <span className="user-meta">
                <span className="user-name">{profile.full_name}</span>
                <span className="user-role">{profile.role === 'farmer' ? 'Farmer' : 'Transporter'}</span>
              </span>
              <button className="icon-btn" onClick={signOut} title="Sign out" aria-label="Sign out">
                <Icon name="logout" size={18} />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>

      {/* Phone-style bottom navigation on small screens */}
      {profile && (
        <nav className="nav-mobile" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              <Icon name={l.icon} size={22} />
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
