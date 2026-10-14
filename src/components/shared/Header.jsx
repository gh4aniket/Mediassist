import { Menu, Bell, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Header({ title, subtitle, onMenuToggle, actions }) {
  const { user } = useAuth()

  return (
    <header className="bg-white border-b border-slate-100 px-4 lg:px-6 py-4 flex items-center gap-4 sticky top-0 z-30">
      <button
        onClick={onMenuToggle}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1">
        <h1
          className="text-lg font-bold text-slate-900 leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        {actions}
        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors relative">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
        </button>
        {user?.avatar && (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-9 h-9 rounded-lg object-cover border-2 border-slate-100"
          />
        )}
      </div>
    </header>
  )
}
