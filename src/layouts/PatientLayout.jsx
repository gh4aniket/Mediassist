import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/shared/Sidebar'
import Header from '../components/shared/Header'
import { useLocation } from 'react-router-dom'

const pageTitles = {
  '/patient/dashboard': { title: 'Overview', subtitle: 'Welcome back — here\'s your health summary' },
  '/patient/request-ambulance': { title: 'Request Ambulance', subtitle: 'Get emergency medical transport quickly' },
  '/patient/live-tracking': { title: 'Live Tracking', subtitle: 'Track your ambulance in real time' },
  '/patient/hospitals': { title: 'Nearby Hospitals', subtitle: 'Find hospitals and check bed availability' },
  '/patient/ai-assistant': { title: 'AI Health Assistant', subtitle: 'Get instant health guidance' },
  '/patient/medical-profile': { title: 'Medical Profile', subtitle: 'Manage your health information' },
  '/patient/request-history': { title: 'Request History', subtitle: 'View all your past ambulance requests' },
  '/patient/profile': { title: 'My Profile', subtitle: 'Manage your personal information' },
}

export default function PatientLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const pageInfo = Object.entries(pageTitles).find(([path]) => pathname.startsWith(path))
  const { title, subtitle } = pageInfo ? pageInfo[1] : { title: 'MediAssist', subtitle: '' }

  return (
    <div className="flex h-full bg-background overflow-hidden">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={title}
          subtitle={subtitle}
          onMenuToggle={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
