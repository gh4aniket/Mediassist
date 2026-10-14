import { useNavigate } from 'react-router-dom'
import { ShieldX, ArrowLeft, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Unauthorized() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleBack = () => {
    if (!user) { navigate('/login'); return }
    if (user.role === 'patient') navigate('/patient/dashboard')
    else if (user.role === 'hospital') navigate('/hospital/dashboard')
    else if (user.role === 'driver') navigate('/driver/home')
    else navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <span className="text-xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>MediAssist</span>
        </div>

        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-12 h-12 text-red-500" />
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Access Denied
        </h1>
        <p className="text-slate-500 mb-2">
          You don't have permission to view this page.
        </p>
        <p className="text-xs text-slate-400 mb-8">
          This section is restricted to a different user role. If you believe this is an error, please contact your administrator.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Go to Dashboard
          </button>
          {user && (
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors text-sm"
            >
              Sign In as Different Role
            </button>
          )}
        </div>

        <p className="text-xs text-slate-400 mt-6">
          Signed in as <span className="font-semibold text-slate-600">{user?.email}</span> ({user?.role})
        </p>
      </div>
    </div>
  )
}
