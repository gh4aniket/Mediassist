import { useState, useRef } from 'react'
import { Camera, Edit2, Save, XCircle, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function PatientProfile() {
  const { user, updateUser } = useAuth()
  const { addToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || '', dateOfBirth: user?.dateOfBirth || '', gender: user?.gender || '' })
  const [errors, setErrors] = useState({})
  const fileRef = useRef(null)

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    return e
  }

  const save = async () => {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      // Email is the login identifier and is not editable through this form.
      const { email: _ignored, ...editable } = form
      await updateUser(editable)
      setEditing(false)
      addToast('Profile updated successfully!', 'success')
    } catch (err) {
      // Surface per-field messages from the API next to the inputs they belong to.
      if (err.errors) setErrors(err.errors)
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || '', dateOfBirth: user?.dateOfBirth || '', gender: user?.gender || '' })
    setErrors({})
    setEditing(false)
  }

  const fields = [
    { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your full name' },
    { key: 'email', label: 'Email Address', type: 'email', placeholder: 'you@example.com', readOnly: true },
    { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+1 (555) 000-0000' },
    { key: 'dateOfBirth', label: 'Date of Birth', type: 'date', placeholder: '' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['', 'Male', 'Female', 'Non-binary', 'Prefer not to say'] },
    { key: 'address', label: 'Home Address', type: 'text', placeholder: 'Street, City, State, ZIP' },
  ]

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mb-5">
        <div className="flex items-start gap-5">
          <div className="relative">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&auto=format'}
              alt={user?.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-100"
            />
            {editing && (
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900 mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>{user?.name}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-100 px-2.5 py-1 rounded-full font-medium capitalize">{user?.role}</span>
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle className="w-3.5 h-3.5" /> Verified account
              </span>
            </div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={cancel} disabled={saving} className="px-3 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50">
                <XCircle className="w-4 h-4" />
              </button>
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-5">Personal Information</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {fields.map(({ key, label, type, placeholder, options, readOnly }) => (
            <div key={key} className={key === 'address' ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                {label}
                {readOnly && <span className="ml-1 normal-case font-normal text-slate-400">(cannot be changed)</span>}
              </label>
              {!editing || readOnly ? (
                <p className="text-sm text-slate-800 py-2">{form[key] || <span className="text-slate-300">Not set</span>}</p>
              ) : type === 'select' ? (
                <select
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                >
                  {options.map((o) => <option key={o} value={o}>{o || 'Select...'}</option>)}
                </select>
              ) : (
                <div>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setErrors((er) => ({ ...er, [key]: '' })) }}
                    placeholder={placeholder}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors[key] ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  />
                  {errors[key] && <p className="mt-1 text-xs text-red-600">{errors[key]}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="mt-5 bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-red-700 mb-2">Danger Zone</h3>
        <p className="text-xs text-slate-500 mb-3">Permanently delete your account and all associated data. This action cannot be undone.</p>
        <button className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  )
}
