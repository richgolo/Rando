import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isConfigured } from './lib/supabase'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import RequireRole from './auth/RequireRole'
import SignIn from './auth/SignIn'
import SignUp from './auth/SignUp'
import Layout from './components/Layout'
import { Empty, Loading } from './components/ui'
import FarmerHome from './farmer/FarmerHome'
import NewRequest from './farmer/NewRequest'
import RequestDetail from './farmer/RequestDetail'
import FindLoads from './transporter/FindLoads'
import MakeOffer from './transporter/MakeOffer'
import MyJobs from './transporter/MyJobs'
import Vehicles from './transporter/Vehicles'
import JobDetail from './shared/JobDetail'

// Sends each user to the right home page for their role.
function Home() {
  const { user, profile, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/signin" replace />
  return <Navigate to={profile?.role === 'transporter' ? '/transporter' : '/farmer'} replace />
}

const farmer = (el) => <RequireRole role="farmer">{el}</RequireRole>
const transporter = (el) => <RequireRole role="transporter">{el}</RequireRole>

export default function App() {
  if (!isConfigured) {
    return (
      <main className="page">
        <Empty title="Supabase is not connected yet">
          <p className="muted">
            Copy <code>.env.example</code> to <code>.env.local</code>, fill in your Supabase URL and publishable key,
            then restart <code>yarn dev</code>. See docs/01-project-setup.md.
          </p>
        </Empty>
      </main>
    )
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />

            <Route path="/farmer" element={farmer(<FarmerHome />)} />
            <Route path="/farmer/new" element={farmer(<NewRequest />)} />
            <Route path="/farmer/requests/:id" element={farmer(<RequestDetail />)} />

            <Route path="/transporter" element={transporter(<FindLoads />)} />
            <Route path="/transporter/requests/:id" element={transporter(<MakeOffer />)} />
            <Route path="/transporter/jobs" element={transporter(<MyJobs />)} />
            <Route path="/transporter/vehicles" element={transporter(<Vehicles />)} />

            <Route path="/jobs/:id" element={<RequireRole><JobDetail /></RequireRole>} />
            <Route path="*" element={<Empty title="Page not found"><a className="btn" href="/">Go home</a></Empty>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
