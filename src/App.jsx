import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { PageLoader } from './components/shared/Loader'
import ErrorBoundary from './components/shared/ErrorBoundary'

// Layouts
import PatientLayout from './layouts/PatientLayout'
import HospitalLayout from './layouts/HospitalLayout'
import DriverLayout from './layouts/DriverLayout'

// Auth
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'

// Patient
import PatientDashboard from './pages/patient/Dashboard'
import RequestAmbulance from './pages/patient/RequestAmbulance'
import LiveTracking from './pages/patient/LiveTracking'
import Hospitals from './pages/patient/Hospitals'
import HospitalDetail from './pages/patient/HospitalDetail'
import AIAssistant from './pages/patient/AIAssistant'
import MedicalProfile from './pages/patient/MedicalProfile'
import RequestHistory from './pages/patient/RequestHistory'
import PatientProfile from './pages/patient/Profile'

// Hospital Staff
import HospitalDashboard from './pages/hospital/Dashboard'
import BedAvailability from './pages/hospital/BedAvailability'
import HospitalAdmin from './pages/hospital/HospitalAdmin'
import StaffManagement from './pages/hospital/StaffManagement'
import HospitalSettings from './pages/hospital/Settings'

// Driver
import DriverHome from './pages/driver/Home'
import ActiveRequest from './pages/driver/ActiveRequest'
import Trip from './pages/driver/Trip'
import DriverProfile from './pages/driver/Profile'

// Shared
import Unauthorized from './pages/Unauthorized'

function ProtectedRoute({ children, allowedRole }) {
  const { user, initialising } = useAuth()
  // Hold the route while the cached session is revalidated, otherwise a reload
  // bounces an authenticated user to /login before /auth/me comes back.
  if (initialising) return <PageLoader message="Restoring your session..." />
  if (!user) return <Navigate to="/login" replace />
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/unauthorized" replace />
  return children
}

function RoleRedirect() {
  const { user, initialising } = useAuth()
  if (initialising) return <PageLoader message="Loading MediAssist..." />
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'patient') return <Navigate to="/patient/dashboard" replace />
  if (user.role === 'hospital') return <Navigate to="/hospital/dashboard" replace />
  if (user.role === 'driver') return <Navigate to="/driver/home" replace />
  return <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Patient */}
      <Route
        path="/patient"
        element={
          <ProtectedRoute allowedRole="patient">
            <PatientLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PatientDashboard />} />
        <Route path="request-ambulance" element={<RequestAmbulance />} />
        <Route path="live-tracking" element={<LiveTracking />} />
        <Route path="hospitals" element={<Hospitals />} />
        <Route path="hospitals/:id" element={<HospitalDetail />} />
        <Route path="ai-assistant" element={<AIAssistant />} />
        <Route path="medical-profile" element={<MedicalProfile />} />
        <Route path="request-history" element={<RequestHistory />} />
        <Route path="profile" element={<PatientProfile />} />
      </Route>

      {/* Hospital Staff */}
      <Route
        path="/hospital"
        element={
          <ProtectedRoute allowedRole="hospital">
            <HospitalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<HospitalDashboard />} />
        <Route path="bed-availability" element={<BedAvailability />} />
        <Route path="admin" element={<HospitalAdmin />} />
        <Route path="staff" element={<StaffManagement />} />
        <Route path="settings" element={<HospitalSettings />} />
      </Route>

      {/* Driver */}
      <Route
        path="/driver"
        element={
          <ProtectedRoute allowedRole="driver">
            <DriverLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<DriverHome />} />
        <Route path="active-request" element={<ActiveRequest />} />
        <Route path="trip" element={<Trip />} />
        <Route path="profile" element={<DriverProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
