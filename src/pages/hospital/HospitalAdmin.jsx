import { useCallback, useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Save, Loader2, X, Award, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/shared/Modal'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import { PageLoader } from '../../components/shared/Loader'
import { useToast } from '../../context/ToastContext'
import useApiResource from '../../hooks/useApiResource'
import { doctorApi, hospitalApi } from '../../services'

const PROFILE_FIELDS = ['name', 'address', 'phone', 'email', 'website', 'description', 'about', 'established']

const DOCTOR_FIELDS = [
  { key: 'name', label: 'Full Name', placeholder: 'Dr. Jane Smith' },
  { key: 'specialization', label: 'Specialization', placeholder: 'e.g. Cardiologist' },
  { key: 'qualifications', label: 'Qualifications', placeholder: 'MD, FACC, ...', wide: true },
  { key: 'experience', label: 'Experience', placeholder: 'e.g. 12 years' },
  { key: 'availability', label: 'Availability', placeholder: 'Mon–Fri, 9 AM – 5 PM' },
  { key: 'email', label: 'Email', placeholder: 'doctor@hospital.org' },
  { key: 'phone', label: 'Phone', placeholder: '+1 (555) 000-0000' },
  { key: 'image', label: 'Profile Image URL', placeholder: 'https://...', wide: true },
]

const emptyDoctor = () =>
  Object.fromEntries([...DOCTOR_FIELDS.map(({ key }) => [key, '']), ['description', '']])

export default function HospitalAdmin() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const hospitalId = user?.hospitalId

  const fetchHospital = useCallback(
    (signal) => (hospitalId ? hospitalApi.get(hospitalId, { signal }) : null),
    [hospitalId],
  )
  const { data: hospital, loading, error, setData } = useApiResource(fetchHospital, [hospitalId], {
    enabled: Boolean(hospitalId),
  })

  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [services, setServices] = useState([])
  const [facilities, setFacilities] = useState([])
  const [newService, setNewService] = useState('')
  const [newFacility, setNewFacility] = useState('')
  const [doctors, setDoctors] = useState([])
  const [doctorModal, setDoctorModal] = useState(null)
  const [deleteDoctor, setDeleteDoctor] = useState(null)

  useEffect(() => {
    if (!hospital) return
    setForm(Object.fromEntries(PROFILE_FIELDS.map((k) => [k, hospital[k] || ''])))
    setServices(hospital.services || [])
    setFacilities(hospital.facilities || [])
    setDoctors(hospital.doctors || [])
  }, [hospital])

  if (!hospitalId) {
    return (
      <div className="p-6 max-w-md mx-auto mt-16 text-center">
        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700 mb-1">No hospital linked</p>
        <p className="text-xs text-slate-500">Your account must be attached to a hospital to administer it.</p>
      </div>
    )
  }

  if (loading) return <PageLoader message="Loading hospital profile..." />

  if (error || !hospital) {
    return (
      <div className="p-6 max-w-md mx-auto mt-10 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800 mb-1">Could not load the hospital</p>
        <p className="text-xs text-slate-500">{error}</p>
      </div>
    )
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const updated = await hospitalApi.update(hospitalId, { ...form, services, facilities })
      setData((prev) => ({ ...updated, doctors: prev?.doctors || doctors }))
      addToast('Hospital profile updated.', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveDoctor = async () => {
    const { mode, data } = doctorModal
    if (!data.name?.trim()) {
      addToast('A doctor needs a name.', 'warning')
      return
    }
    setSaving(true)
    try {
      if (mode === 'add') {
        const created = await doctorApi.create(hospitalId, data)
        setDoctors((prev) => [...prev, created])
        addToast('Doctor added successfully.', 'success')
      } else {
        const updated = await doctorApi.update(data.id, data)
        setDoctors((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
        addToast('Doctor updated successfully.', 'success')
      }
      setDoctorModal(null)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDeleteDoctor = async () => {
    const target = deleteDoctor
    setDeleteDoctor(null)
    try {
      await doctorApi.remove(target.id)
      setDoctors((prev) => prev.filter((d) => d.id !== target.id))
      addToast('Doctor removed.', 'info')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const listSections = [
    { label: 'Services', items: services, setItems: setServices, newItem: newService, setNew: setNewService, color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { label: 'Facilities', items: facilities, setItems: setFacilities, newItem: newFacility, setNew: setNewFacility, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ]

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
        <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">Staff Only</span>
        <p className="text-xs text-amber-700">Changes here are immediately visible to patients browsing hospitals.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 mb-5">
        {['profile', 'doctors'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-6 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${activeTab === t ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'profile' ? 'Hospital Profile' : 'Doctors Management'}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Basic Information</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: 'name', label: 'Hospital Name' },
                { key: 'phone', label: 'Phone Number' },
                { key: 'email', label: 'Email Address' },
                { key: 'website', label: 'Website' },
                { key: 'established', label: 'Established' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
                  <input
                    type="text"
                    value={form[key] || ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Address</label>
                <input
                  type="text"
                  value={form.address || ''}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              {[
                { key: 'description', label: 'Short Description', rows: 2 },
                { key: 'about', label: 'About', rows: 4 },
              ].map(({ key, label, rows }) => (
                <div key={key} className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
                  <textarea
                    rows={rows}
                    value={form[key] || ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Services & Facilities */}
          <div className="grid sm:grid-cols-2 gap-5">
            {listSections.map(({ label, items, setItems, newItem, setNew, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">{label}</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {items.map((item, i) => (
                    <span key={`${item}-${i}`} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border font-medium ${color}`}>
                      {item}
                      <button onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))} className="hover:opacity-70">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {items.length === 0 && <p className="text-xs text-slate-400">None added yet</p>}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNew(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (newItem.trim()) { setItems((p) => [...p, newItem.trim()]); setNew('') }
                      }
                    }}
                    placeholder={`Add ${label.toLowerCase().slice(0, -1)}...`}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <button
                    onClick={() => { if (newItem.trim()) { setItems((p) => [...p, newItem.trim()]); setNew('') } }}
                    className="px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'doctors' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">{doctors.length} doctor{doctors.length !== 1 ? 's' : ''} listed</p>
            <button
              onClick={() => setDoctorModal({ mode: 'add', data: emptyDoctor() })}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Doctor
            </button>
          </div>

          {doctors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center shadow-sm">
              <p className="text-sm text-slate-500">No doctors listed yet.</p>
              <p className="text-xs text-slate-400 mt-1">Add your first doctor so patients can see who practises here.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {doctors.map((doc) => (
                <div key={doc.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <img
                      src={doc.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&h=80&fit=crop&auto=format'}
                      alt={doc.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate" style={{ fontFamily: 'var(--font-display)' }}>{doc.name}</p>
                      <p className="text-xs text-primary font-medium">{doc.specialization}</p>
                      {doc.experience && (
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <Award className="w-3 h-3" />{doc.experience}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setDoctorModal({ mode: 'edit', data: { ...doc } })}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteDoctor(doc)}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2.5 leading-snug line-clamp-2">{doc.qualifications}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Doctor Modal */}
      <Modal
        isOpen={!!doctorModal}
        onClose={() => setDoctorModal(null)}
        title={doctorModal?.mode === 'add' ? 'Add Doctor' : 'Edit Doctor'}
        size="md"
      >
        {doctorModal && (
          <div className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              {DOCTOR_FIELDS.map(({ key, label, placeholder, wide }) => (
                <div key={key} className={wide ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
                  <input
                    type="text"
                    value={doctorModal.data[key] || ''}
                    onChange={(e) =>
                      setDoctorModal((prev) => ({ ...prev, data: { ...prev.data, [key]: e.target.value } }))
                    }
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Description</label>
                <textarea
                  rows={3}
                  value={doctorModal.data.description || ''}
                  onChange={(e) =>
                    setDoctorModal((prev) => ({ ...prev, data: { ...prev.data, description: e.target.value } }))
                  }
                  placeholder="Professional background and expertise..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDoctorModal(null)}
                disabled={saving}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveDoctor}
                disabled={saving}
                className="flex-1 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {doctorModal.mode === 'add' ? 'Add Doctor' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteDoctor}
        onClose={() => setDeleteDoctor(null)}
        onConfirm={confirmDeleteDoctor}
        title="Remove Doctor"
        message={`Remove ${deleteDoctor?.name} from the doctors list? Patients will no longer see this profile.`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  )
}
