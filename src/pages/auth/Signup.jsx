import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Heart, AlertCircle, Loader2, CheckCircle, User, Building2, Ambulance } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const roles = [
  { id: 'patient', label: 'Patient', icon: User, desc: 'Request ambulances, track rides, manage health records', color: 'border-cyan-300 bg-cyan-50 text-cyan-700' },
  { id: 'hospital', label: 'Hospital Staff', icon: Building2, desc: 'Manage bed availability, doctors, and hospital profile', color: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  { id: 'driver', label: 'Ambulance Driver', icon: Ambulance, desc: 'Accept dispatch requests and manage active trips', color: 'border-amber-300 bg-amber-50 text-amber-700' },
]

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [role, setRole] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', hospitalName: '', vehicleId: '' })
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [apiError, setApiError] = useState('')

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Full name is required'
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Minimum 6 characters'
    if (!form.phone) e.phone = 'Phone number is required'
    if (role === 'hospital' && !form.hospitalName.trim()) e.hospitalName = 'Hospital name is required'
    if (role === 'driver' && !form.vehicleId.trim()) e.vehicleId = 'Vehicle / Ambulance ID is required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    setApiError('')
    try {
      await signup({ ...form, role })
      setSuccess(true)
    } catch (err) {
      setApiError(err.message)
      // Show any per-field messages the API returned next to their inputs.
      if (err.errors) setErrors((prev) => ({ ...prev, ...err.errors }))
      if (err.status === 409) setStep(2)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Account Created!
          </h2>
          <p className="text-slate-600 text-sm mb-8">
            Your MediAssist account has been created successfully. Sign in to get started.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors text-sm"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <span className="text-xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>MediAssist</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Create your account
          </h1>
          <p className="text-sm text-slate-500">Join thousands of healthcare professionals and patients</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {['Choose Role', 'Your Details'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>
                {step > i + 1 ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${step === i + 1 ? 'text-slate-800' : 'text-slate-400'}`}>{s}</span>
              {i < 1 && <div className={`w-12 h-0.5 ${step > 1 ? 'bg-primary' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          {step === 1 && (
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-4">What best describes you?</h2>
              <div className="space-y-3">
                {roles.map(({ id, label, icon: Icon, desc, color }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRole(id)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      role === id ? color + ' shadow-sm' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${role === id ? '' : 'bg-slate-100'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button
                disabled={!role}
                onClick={() => setStep(2)}
                className="w-full mt-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-40 text-sm"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex items-center gap-2 mb-5">
                <button type="button" onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600 text-sm">← Back</button>
                <h2 className="text-base font-semibold text-slate-800">Your Details</h2>
              </div>

              {apiError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{apiError}</p>
                </div>
              )}

              <div className="space-y-4">
                {[
                  { key: 'name', label: 'Full Name', placeholder: 'Dr. John Smith', type: 'text' },
                  { key: 'email', label: 'Email Address', placeholder: 'you@example.com', type: 'email' },
                  { key: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', type: 'tel' },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                    <input
                      type={type}
                      value={form[key]}
                      onChange={(e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setErrors((er) => ({ ...er, [key]: '' })) }}
                      placeholder={placeholder}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${errors[key] ? 'border-red-300' : 'border-slate-200'}`}
                    />
                    {errors[key] && <p className="mt-1 text-xs text-red-600">{errors[key]}</p>}
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => { setForm((f) => ({ ...f, password: e.target.value })); setErrors((er) => ({ ...er, password: '' })) }}
                      placeholder="Min. 6 characters"
                      className={`w-full px-4 py-2.5 pr-11 rounded-xl border text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${errors.password ? 'border-red-300' : 'border-slate-200'}`}
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                </div>

                {/* Role-specific fields */}
                {role === 'hospital' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Hospital Name</label>
                    <input
                      type="text"
                      value={form.hospitalName}
                      onChange={(e) => { setForm((f) => ({ ...f, hospitalName: e.target.value })); setErrors((er) => ({ ...er, hospitalName: '' })) }}
                      placeholder="e.g. Boston General Medical Center"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.hospitalName ? 'border-red-300' : 'border-slate-200'}`}
                    />
                    {errors.hospitalName && <p className="mt-1 text-xs text-red-600">{errors.hospitalName}</p>}
                  </div>
                )}

                {role === 'driver' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Ambulance / Vehicle ID</label>
                    <input
                      type="text"
                      value={form.vehicleId}
                      onChange={(e) => { setForm((f) => ({ ...f, vehicleId: e.target.value })); setErrors((er) => ({ ...er, vehicleId: '' })) }}
                      placeholder="e.g. AMB-2047"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.vehicleId ? 'border-red-300' : 'border-slate-200'}`}
                    />
                    {errors.vehicleId && <p className="mt-1 text-xs text-red-600">{errors.vehicleId}</p>}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
