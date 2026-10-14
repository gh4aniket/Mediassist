import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/shared/Sidebar'
import Header from '../components/shared/Header'

const pageTitles = {
  '/hospital/dashboard': { title: 'Dashboard', subtitle: 'Hospital operations at a glance' },
  '/hospital/bed-availability': { title: 'Bed Availability', subtitle: 'Manage bed counts across all wards' },
  '/hospital/admin': { title: 'Hospital Administration', subtitle: 'Manage hospital profile, doctors, and facilities' },
  '/hospital/staff': { title: 'Staff Management', subtitle: 'View and manage your hospital team' },
  '/hospital/settings': { title: 'Settings', subtitle: 'Configure hospital preferences and notifications' },
}

export default function HospitalLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const pageInfo = Object.entries(pageTitles).find(([path]) => pathname.startsWith(path))
  const { title, subtitle } = pageInfo ? pageInfo[1] : { title: 'Hospital Staff', subtitle: '' }

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
