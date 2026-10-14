import { useEffect, useState } from 'react'
import { Edit2, Save, XCircle, Loader2, Star, Shield, Award } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { driverApi } from '../../services'

const EDITABLE = ['name', 'phone', 'vehicleId', 'licenseNumber', 'experience', 'certifications']

const FIELDS = [
  { key: 'name', label: 'Full Name' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'vehicleId', label: 'Vehicle / Ambulance ID' },
  { key: 'licenseNumber', label: 'License Number' },
  { key: 'experience', label: 'Years of Experience' },
  { key: 'certifications', label: 'Certifications' },
]

const formFrom = (user) => Object.fromEntries(EDITABLE.map((key) => [key, user?.[key] || '']))

export default function DriverProfile() {
  const { user, updateUser } = useAuth()
  const { addToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [liveStats, setLiveStats] = useState(null)
  const [form, setForm] = useState(() => formFrom(user))

  // Trip counts and rating are derived server-side from completed bookings.
  useEffect(() => {
    let cancelled = false
    driverApi
      .stats()
      .then((s) => !cancelled && setLiveStats(s))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await updateUser(form)
      setEditing(false)
      addToast('Profile updated successfully!', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setForm(formFrom(user))
    setEditing(false)
  }

  const stats = [
    { label: 'Total Trips', value: liveStats?.totalTrips ?? 0, color: 'text-primary' },
    { label: 'Rating', value: `${liveStats?.rating ?? 5}`, color: 'text-amber-600' },
    { label: 'Acceptance', value: `${liveStats?.acceptanceRate ?? 100}%`, color: 'text-emerald-600' },
    { label: 'This Week', value: liveStats?.tripsThisWeek ?? 0, color: 'text-purple-600' },
  ]

  /** Credentials come from what the driver actually entered, not a fixed list. */
  const credentials = (user?.certifications || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((label, i) => ({ icon: i === 0 ? Shield : Award, label }))

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">
      {/* Profile card */}
      <div className="bg-gradient-to-r from-[#0c1220] to-[#0e3a52] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-40 h-40 bg-primary/20 rounded-full -translate-y-10 translate-x-10" />
        <div className="relative z-10 flex items-start gap-5">
          <img src={user?.avatar} alt={user?.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20" />
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{user?.name}</h2>
            <p className="text-slate-300 text-sm">{user?.vehicleId}</p>
            <div className="flex items-center gap-3 mt-2">
              {credentials[0] && (
                <span className="text-xs bg-emerald-500 px-2.5 py-1 rounded-full font-semibold">
                  {credentials[0].label}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-slate-300">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {liveStats?.rating ?? 5} rating
              </span>
              <span className="text-xs text-slate-300 capitalize">
                {liveStats?.assigned ? 'On a trip' : liveStats?.availability || user?.availability}
              </span>
            </div>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-4 gap-3 mt-5">
          {stats.map(({ label, value, color }) => (
            <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
              <p className={`text-lg font-bold ${color}`} style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
              <p className="text-xs text-slate-300 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-slate-800">Driver Information</h3>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={cancel} disabled={saving} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 disabled:opacity-50">
                <XCircle className="w-4 h-4" />
              </button>
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
              {editing ? (
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              ) : (
                <p className="text-sm text-slate-800 py-2">{form[key] || <span className="text-slate-300">Not set</span>}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Credentials */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Credentials & Certifications</h3>
        <div className="space-y-3">
          {credentials.length === 0 ? (
            <p className="text-sm text-slate-400">
              No certifications recorded yet — add them in the Certifications field above, separated by commas.
            </p>
          ) : (
            credentials.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Icon className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500">On file with MediAssist</p>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Recorded</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
