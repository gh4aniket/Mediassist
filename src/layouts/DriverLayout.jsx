import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/shared/Sidebar'
import Header from '../components/shared/Header'

const pageTitles = {
  '/driver/home': { title: 'Driver Home', subtitle: 'Manage your availability and incoming requests' },
  '/driver/active-request': { title: 'Active Request', subtitle: 'Current assignment details and patient info' },
  '/driver/trip': { title: 'Active Trip', subtitle: 'Navigate to patient and update trip status' },
  '/driver/profile': { title: 'My Profile', subtitle: 'Manage your driver information' },
}

export default function DriverLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const pageInfo = Object.entries(pageTitles).find(([path]) => pathname.startsWith(path))
  const { title, subtitle } = pageInfo ? pageInfo[1] : { title: 'Driver Console', subtitle: '' }

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
