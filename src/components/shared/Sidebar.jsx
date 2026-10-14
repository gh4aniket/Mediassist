import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Ambulance, MapPin, Building2, Bot, ClipboardList, History, User,
  BedDouble, Settings, Users, Stethoscope, Home, Navigation, LogOut, X, ChevronRight,
  Heart, Shield,
} from 'lucide-react'

const navConfigs = {
  patient: [
    { label: 'Overview', icon: LayoutDashboard, to: '/patient/dashboard' },
    { label: 'Request Ambulance', icon: Ambulance, to: '/patient/request-ambulance', accent: true },
    { label: 'Live Tracking', icon: Navigation, to: '/patient/live-tracking' },
    { label: 'Hospitals', icon: Building2, to: '/patient/hospitals' },
    { label: 'AI Assistant', icon: Bot, to: '/patient/ai-assistant' },
    { label: 'Medical Profile', icon: ClipboardList, to: '/patient/medical-profile' },
    { label: 'Request History', icon: History, to: '/patient/request-history' },
    { label: 'Profile', icon: User, to: '/patient/profile' },
  ],
  hospital: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/hospital/dashboard' },
    { label: 'Bed Availability', icon: BedDouble, to: '/hospital/bed-availability' },
    { label: 'Hospital Profile', icon: Building2, to: '/hospital/admin' },
    { label: 'Staff', icon: Users, to: '/hospital/staff' },
    { label: 'Settings', icon: Settings, to: '/hospital/settings' },
  ],
  driver: [
    { label: 'Home', icon: Home, to: '/driver/home' },
    { label: 'Active Request', icon: Ambulance, to: '/driver/active-request' },
    { label: 'Trip', icon: Navigation, to: '/driver/trip' },
    { label: 'Profile', icon: User, to: '/driver/profile' },
  ],
}

const roleLabels = {
  patient: 'Patient Portal',
  hospital: 'Hospital Staff',
  driver: 'Driver Console',
}

const roleIcons = {
  patient: Heart,
  hospital: Stethoscope,
  driver: Shield,
}

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const nav = navConfigs[user?.role] || []
  const RoleIcon = roleIcons[user?.role] || Heart

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 w-64 flex flex-col
          lg:static lg:translate-x-0 transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ background: 'var(--color-sidebar)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <div>
              <span className="text-white font-bold text-base tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                MediAssist
              </span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-sidebar-muted)' }}>
                {roleLabels[user?.role]}
              </p>
            </div>
          </div>
          <button
            onClick={onMobileClose}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-lg object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <RoleIcon className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--color-sidebar-muted)' }}>
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {nav.map(({ label, icon: Icon, to, accent }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : accent
                      ? 'text-red-300 hover:bg-red-500/20 hover:text-red-200'
                      : 'text-slate-400 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/15 hover:text-red-400 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
