import { useCallback, useState } from 'react'
import { Plus, X, Edit2, Save, XCircle, AlertTriangle, Loader2, User, Phone } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { PageLoader } from '../../components/shared/Loader'
import useApiResource from '../../hooks/useApiResource'
import { medicalProfileApi } from '../../services'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

/** Sub-document rows created client-side get a temporary id until saved. */
const tempId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export default function MedicalProfile() {
  const { addToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(null)

  const fetchProfile = useCallback((signal) => medicalProfileApi.me({ signal }), [])
  const { data: profile, loading, error, setData } = useApiResource(fetchProfile, [])

  if (loading) return <PageLoader message="Loading your medical profile..." />

  if (error || !profile) {
    return (
      <div className="p-6 max-w-md mx-auto mt-10 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800 mb-1">Could not load your profile</p>
        <p className="text-xs text-slate-500">{error}</p>
      </div>
    )
  }

  const startEdit = () => {
    setDraft(structuredClone(profile))
    setEditing(true)
  }

  const cancelEdit = () => {
    setDraft(null)
    setEditing(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      const saved = await medicalProfileApi.save({
        bloodGroup: draft.bloodGroup,
        height: draft.height,
        weight: draft.weight,
        allergies: draft.allergies,
        conditions: draft.conditions,
        // Strip client-only ids so the server assigns real ones to new rows.
        medications: draft.medications.map(({ id, ...m }) => ({
          ...m,
          ...(String(id).startsWith('tmp-') ? {} : { id }),
        })),
        emergencyContacts: draft.emergencyContacts.map(({ id, ...c }) => ({
          ...c,
          ...(String(id).startsWith('tmp-') ? {} : { id }),
        })),
      })
      setData(saved)
      setDraft(null)
      setEditing(false)
      addToast('Medical profile updated successfully.', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const data = editing ? draft : profile
  const setDataDraft = editing ? setDraft : () => {}

  const addItem = (field, value) => {
    if (!value.trim()) return
    setDataDraft((prev) => ({ ...prev, [field]: [...(prev[field] || []), value.trim()] }))
  }

  const removeItem = (field, idx) => {
    setDataDraft((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }))
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>Medical Profile</h2>
          <p className="text-xs text-slate-500">
            Responders see your blood group, allergies and conditions during an active request
          </p>
        </div>
        {!editing ? (
          <button onClick={startEdit} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors">
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={cancelEdit} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50">
              <XCircle className="w-4 h-4" /> Cancel
            </button>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Vital Info */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Vital Information</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1.5 block">Blood Group</label>
              {editing ? (
                <div className="grid grid-cols-4 gap-2">
                  {BLOOD_GROUPS.map((bg) => (
                    <button
                      key={bg}
                      onClick={() => setDataDraft((p) => ({ ...p, bloodGroup: bg }))}
                      className={`py-2 rounded-xl text-sm font-bold border-2 transition-colors ${data.bloodGroup === bg ? 'bg-red-600 border-red-600 text-white' : 'bg-red-50 border-red-100 text-red-700 hover:border-red-300'}`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="inline-block px-4 py-2 bg-red-50 text-red-700 font-bold text-lg rounded-xl border border-red-100">
                  {data.bloodGroup || 'Not set'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[{ k: 'height', label: 'Height' }, { k: 'weight', label: 'Weight' }].map(({ k, label }) => (
                <div key={k}>
                  <label className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1 block">{label}</label>
                  {editing ? (
                    <input
                      type="text"
                      value={data[k] || ''}
                      onChange={(e) => setDataDraft((p) => ({ ...p, [k]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">{data[k] || '—'}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <TagSection
          title="Allergies"
          items={data.allergies || []}
          editing={editing}
          color="bg-amber-50 text-amber-700 border-amber-200"
          onAdd={(v) => addItem('allergies', v)}
          onRemove={(i) => removeItem('allergies', i)}
          placeholder="e.g. Penicillin"
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
        />

        <TagSection
          title="Medical Conditions"
          items={data.conditions || []}
          editing={editing}
          color="bg-red-50 text-red-700 border-red-200"
          onAdd={(v) => addItem('conditions', v)}
          onRemove={(i) => removeItem('conditions', i)}
          placeholder="e.g. Hypertension"
        />

        {/* Medications */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Current Medications</h3>
          <div className="space-y-2.5">
            {(data.medications || []).map((med, i) => (
              <div key={med.id || i} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-blue-600">Rx</span>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  {editing ? (
                    ['name', 'dosage', 'frequency'].map((field) => (
                      <input
                        key={field}
                        type="text"
                        value={med[field] || ''}
                        onChange={(e) =>
                          setDataDraft((p) => ({
                            ...p,
                            medications: p.medications.map((m, mi) => (mi === i ? { ...m, [field]: e.target.value } : m)),
                          }))
                        }
                        placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                        className="px-2.5 py-1.5 rounded-lg border border-blue-200 text-xs outline-none focus:border-blue-400 bg-white"
                      />
                    ))
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-800">{med.name}</p>
                      <p className="text-sm text-slate-600">{med.dosage}</p>
                      <p className="text-xs text-slate-500">{med.frequency}</p>
                    </>
                  )}
                </div>
                {editing && (
                  <button onClick={() => removeItem('medications', i)} className="text-red-400 hover:text-red-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {!editing && !data.medications?.length && (
              <p className="text-xs text-slate-400">No medications recorded</p>
            )}
            {editing && (
              <button
                onClick={() =>
                  setDataDraft((p) => ({
                    ...p,
                    medications: [...(p.medications || []), { id: tempId(), name: '', dosage: '', frequency: '' }],
                  }))
                }
                className="w-full py-2.5 border border-dashed border-blue-300 text-blue-600 text-sm rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Medication
              </button>
            )}
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-slate-800">Emergency Contacts</h3>
          </div>
          <div className="space-y-3">
            {(data.emergencyContacts || []).map((contact, i) => (
              <div key={contact.id || i} className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 grid sm:grid-cols-3 gap-2">
                  {editing ? (
                    ['name', 'relationship', 'phone'].map((field) => (
                      <input
                        key={field}
                        type="text"
                        value={contact[field] || ''}
                        onChange={(e) =>
                          setDataDraft((p) => ({
                            ...p,
                            emergencyContacts: p.emergencyContacts.map((c, ci) => (ci === i ? { ...c, [field]: e.target.value } : c)),
                          }))
                        }
                        placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                        className="px-2.5 py-1.5 rounded-lg border border-red-200 text-xs outline-none focus:border-red-400 bg-white"
                      />
                    ))
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-800">{contact.name}</p>
                      <p className="text-xs text-slate-500">{contact.relationship}</p>
                      <p className="text-xs text-slate-600 flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</p>
                    </>
                  )}
                </div>
                {editing && (
                  <button onClick={() => removeItem('emergencyContacts', i)} className="text-red-400 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {!editing && !data.emergencyContacts?.length && (
              <p className="text-xs text-slate-400">No emergency contacts recorded</p>
            )}
            {editing && (
              <button
                onClick={() =>
                  setDataDraft((p) => ({
                    ...p,
                    emergencyContacts: [...(p.emergencyContacts || []), { id: tempId(), name: '', relationship: '', phone: '' }],
                  }))
                }
                className="w-full py-2.5 border border-dashed border-red-300 text-red-600 text-sm rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Emergency Contact
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TagSection({ title, items, editing, color, onAdd, onRemove, placeholder, icon }) {
  const [newItem, setNewItem] = useState('')

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${color}`}>
            {item}
            {editing && (
              <button onClick={() => onRemove(i)} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        {items.length === 0 && <p className="text-xs text-slate-400">None recorded</p>}
      </div>
      {editing && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onAdd(newItem)
                setNewItem('')
              }
            }}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <button onClick={() => { onAdd(newItem); setNewItem('') }} className="px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
