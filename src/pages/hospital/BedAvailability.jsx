import { useCallback, useEffect, useState } from 'react'
import { Save, XCircle, RotateCcw, Loader2, AlertTriangle, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import { PageLoader } from '../../components/shared/Loader'
import { useToast } from '../../context/ToastContext'
import useApiResource from '../../hooks/useApiResource'
import { hospitalApi } from '../../services'

const WARDS = [
  { key: 'icu', label: 'ICU', sublabel: 'Intensive Care Unit', color: 'border-red-200 bg-red-50', icon: '🚨', headColor: 'text-red-700', bar: 'bg-red-500' },
  { key: 'general', label: 'General Ward', sublabel: 'Standard Admission', color: 'border-cyan-200 bg-cyan-50', icon: '🏥', headColor: 'text-cyan-700', bar: 'bg-primary' },
  { key: 'emergency', label: 'Emergency', sublabel: 'Emergency Department', color: 'border-amber-200 bg-amber-50', icon: '⚡', headColor: 'text-amber-700', bar: 'bg-amber-500' },
]

const emptyBeds = () => ({
  icu: { total: 0, available: 0 },
  general: { total: 0, available: 0 },
  emergency: { total: 0, available: 0 },
})

/** Keeps only the three ward counters, dropping Mongo sub-document extras. */
function normaliseBeds(beds) {
  const out = emptyBeds()
  for (const { key } of WARDS) {
    out[key] = {
      total: beds?.[key]?.total ?? 0,
      available: beds?.[key]?.available ?? 0,
    }
  }
  return out
}

export default function BedAvailability() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const fetchHospital = useCallback(
    (signal) => (user?.hospitalId ? hospitalApi.get(user.hospitalId, { signal }) : null),
    [user?.hospitalId],
  )
  const { data: hospital, loading, error, setData } = useApiResource(fetchHospital, [user?.hospitalId], {
    enabled: Boolean(user?.hospitalId),
  })

  const [beds, setBeds] = useState(emptyBeds)
  const [saved, setSaved] = useState(emptyBeds)
  const [busy, setBusy] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [errors, setErrors] = useState({})

  // Seed the editable copy once the hospital arrives (and after every save).
  useEffect(() => {
    if (!hospital) return
    const next = normaliseBeds(hospital.beds)
    setBeds(next)
    setSaved(next)
  }, [hospital])

  if (!user?.hospitalId) {
    return (
      <div className="p-6 max-w-md mx-auto mt-16 text-center">
        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700 mb-1">No hospital linked</p>
        <p className="text-xs text-slate-500">Your account must be attached to a hospital to manage beds.</p>
      </div>
    )
  }

  if (loading) return <PageLoader message="Loading bed capacity..." />

  if (error || !hospital) {
    return (
      <div className="p-6 max-w-md mx-auto mt-10 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800 mb-1">Could not load bed capacity</p>
        <p className="text-xs text-slate-500">{error}</p>
      </div>
    )
  }

  const isDirty = JSON.stringify(beds) !== JSON.stringify(saved)

  const validate = () => {
    const e = {}
    for (const { key } of WARDS) {
      const total = Number(beds[key].total)
      const available = Number(beds[key].available)
      if (!Number.isFinite(total) || total < 0) e[`${key}_total`] = 'Must be 0 or more'
      if (!Number.isFinite(available) || available < 0) e[`${key}_available`] = 'Cannot be negative'
      else if (available > total) e[`${key}_available`] = 'Cannot exceed total beds'
    }
    return e
  }

  const handleChange = (ward, field, value) => {
    const num = parseInt(value, 10)
    setBeds((prev) => ({ ...prev, [ward]: { ...prev[ward], [field]: Number.isNaN(num) ? '' : num } }))
    setErrors((e) => ({ ...e, [`${ward}_${field}`]: '' }))
  }

  const handleSave = () => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return
    setConfirmSave(true)
  }

  const confirmAndSave = async () => {
    setConfirmSave(false)
    setBusy(true)
    try {
      const updated = await hospitalApi.updateBeds(user.hospitalId, beds)
      setData(updated)
      addToast('Bed availability updated — patients now see the new counts.', 'success')
    } catch (err) {
      if (err.errors) setErrors(err.errors)
      addToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const confirmAndReset = () => {
    setBeds(structuredClone(saved))
    setErrors({})
    setConfirmReset(false)
    addToast('Reverted to the last saved values.', 'info')
  }

  const minAgo = Math.max(
    0,
    Math.round((Date.now() - new Date(hospital.lastUpdated).getTime()) / 60000),
  )

  const sum = (field) => WARDS.reduce((total, { key }) => total + (Number(beds[key][field]) || 0), 0)

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <p className="text-xs text-slate-500">
            Last updated {minAgo < 60 ? `${minAgo}m ago` : `${Math.round(minAgo / 60)}h ago`}
          </p>
          {isDirty && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3" /> Unsaved changes
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirmReset(true)}
            disabled={!isDirty}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={() => { setBeds(structuredClone(saved)); setErrors({}) }}
            disabled={!isDirty}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors disabled:opacity-40"
          >
            <XCircle className="w-3.5 h-3.5" /> Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={busy || !isDirty}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {busy ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Ward cards */}
      <div className="space-y-4">
        {WARDS.map(({ key, label, sublabel, color, icon, headColor, bar }) => {
          const ward = beds[key]
          const total = Number(ward.total) || 0
          const available = Number(ward.available) || 0
          const pct = total > 0 ? Math.round((available / total) * 100) : 0
          return (
            <div key={key} className={`bg-white rounded-2xl border p-5 shadow-sm ${color.split(' ')[0]}`}>
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <h3 className={`font-bold ${headColor}`} style={{ fontFamily: 'var(--font-display)' }}>{label}</h3>
                    <p className="text-xs text-slate-500">{sublabel}</p>
                  </div>
                </div>
                <div className={`text-right px-3 py-1.5 rounded-xl ${color}`}>
                  <p className={`text-xl font-bold ${headColor}`}>{pct}%</p>
                  <p className="text-xs text-slate-500">available</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {[{ field: 'total', label: 'Total Beds' }, { field: 'available', label: 'Available Beds' }].map(({ field, label: fLabel }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{fLabel}</label>
                    <input
                      type="number"
                      min={0}
                      value={ward[field]}
                      onChange={(e) => handleChange(key, field, e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-lg font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${errors[`${key}_${field}`] ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                    />
                    {errors[`${key}_${field}`] && (
                      <p className="mt-1 text-xs text-red-600">{errors[`${key}_${field}`]}</p>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1">
                  <div className={`h-2.5 rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{available} available</span>
                  <span>{Math.max(0, total - available)} occupied</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Total Beds', value: sum('total') },
            { label: 'Available', value: sum('available'), color: 'text-emerald-600' },
            { label: 'Occupied', value: Math.max(0, sum('total') - sum('available')), color: 'text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className={`text-2xl font-bold ${color || 'text-slate-800'}`} style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={confirmAndSave}
        title="Update Bed Availability"
        message="This updates the counts patients and dispatchers see when choosing a hospital. Please confirm the numbers are correct."
        confirmLabel="Yes, Update"
        loading={busy}
      />
      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={confirmAndReset}
        title="Discard Changes?"
        message="This discards your edits and restores the last values saved to the server."
        confirmLabel="Discard"
        variant="warning"
      />
    </div>
  )
}
