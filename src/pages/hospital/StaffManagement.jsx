import { useCallback, useState } from 'react'
import { Search, Filter, Users, Mail, Phone, Calendar, Plus, Loader2, Trash2, AlertCircle } from 'lucide-react'
import StatusBadge from '../../components/shared/StatusBadge'
import Modal from '../../components/shared/Modal'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import EmptyState from '../../components/shared/EmptyState'
import { SkeletonCard } from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import useApiResource from '../../hooks/useApiResource'
import { staffApi } from '../../services'

const STATUSES = ['all', 'active', 'inactive', 'on-leave']

const NEW_STAFF = {
  name: '',
  email: '',
  role: '',
  department: '',
  phone: '',
  status: 'active',
}

function formatDate(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function StaffManagement() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const hospitalId = user?.hospitalId

  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [addModal, setAddModal] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchStaff = useCallback(
    (signal) =>
      hospitalId
        ? staffApi.listForHospital(
            hospitalId,
            { q: query || undefined, role: roleFilter, status: statusFilter },
            { signal },
          )
        : null,
    [hospitalId, query, roleFilter, statusFilter],
  )

  const { data, loading, error, reload } = useApiResource(
    fetchStaff,
    [hospitalId, query, roleFilter, statusFilter],
    { enabled: Boolean(hospitalId) },
  )

  if (!hospitalId) {
    return (
      <div className="p-6 max-w-md mx-auto mt-16 text-center">
        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700 mb-1">No hospital linked</p>
        <p className="text-xs text-slate-500">Your account must be attached to a hospital to manage staff.</p>
      </div>
    )
  }

  const staff = data?.data || []
  // Role facets come from the server so they cover the whole team, not just this page.
  const roles = ['all', ...(data?.meta?.roles || [])]

  const saveStaff = async () => {
    if (!addModal.name.trim() || !addModal.email.trim()) {
      addToast('Name and email are both required.', 'warning')
      return
    }
    setSaving(true)
    try {
      await staffApi.create(hospitalId, addModal)
      addToast(`${addModal.name} added to the staff directory.`, 'success')
      setAddModal(null)
      reload()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const removeStaff = async () => {
    const target = confirmRemove
    setConfirmRemove(null)
    try {
      await staffApi.remove(target.id)
      addToast(`${target.name} removed.`, 'info')
      setSelected(null)
      reload()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const toggleStatus = async (member, status) => {
    try {
      await staffApi.update(member.id, { status })
      addToast(`${member.name} is now ${status}.`, 'success')
      setSelected((prev) => (prev ? { ...prev, status } : prev))
      reload()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Search & filter bar */}
      <div className="mb-5 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, or department..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${showFilters ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
          <button
            onClick={() => setAddModal({ ...NEW_STAFF })}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {showFilters && (
          <div className="bg-white rounded-xl border border-slate-100 p-4 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Role</label>
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors capitalize ${roleFilter === r ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Status</label>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors capitalize ${statusFilter === s ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800">{staff.length}</span> staff member{staff.length !== 1 ? 's' : ''}
        </p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
          <AlertCircle className="w-7 h-7 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-red-800 mb-1">Could not load the staff directory</p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      ) : loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>
      ) : staff.length === 0 ? (
        <EmptyState preset="staff" />
      ) : (
        <>
          {/* Table (desktop) */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/50">
                  {['Staff Member', 'Role & Department', 'Contact', 'Joined', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-xl object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-400">
                            {member.name?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                          <p className="text-xs text-slate-400">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-slate-700">{member.role}</p>
                      <p className="text-xs text-slate-400">{member.department}</p>
                    </td>
                    <td className="px-5 py-3.5"><p className="text-xs text-slate-600">{member.phone || '—'}</p></td>
                    <td className="px-5 py-3.5"><p className="text-xs text-slate-600">{formatDate(member.joinDate)}</p></td>
                    <td className="px-5 py-3.5"><StatusBadge status={member.status} /></td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => setSelected(member)} className="text-xs font-semibold text-primary hover:underline">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards (mobile) */}
          <div className="lg:hidden space-y-3">
            {staff.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm"
                onClick={() => setSelected(member)}
              >
                <div className="flex items-center gap-3 mb-3">
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} className="w-11 h-11 rounded-xl object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-base font-bold text-slate-400">
                      {member.name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
                    <p className="text-xs text-slate-500">{member.role} · {member.department}</p>
                  </div>
                  <StatusBadge status={member.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{member.email}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Staff Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Staff Details" size="sm">
        {selected && (
          <div className="p-5">
            <div className="flex items-center gap-4 mb-5">
              {selected.avatar ? (
                <img src={selected.avatar} alt={selected.name} className="w-16 h-16 rounded-2xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-400">
                  {selected.name?.[0]}
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>{selected.name}</h3>
                <p className="text-sm text-primary font-medium">{selected.role}</p>
                <p className="text-xs text-slate-400">{selected.department}</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { icon: Mail, label: 'Email', value: selected.email },
                { icon: Phone, label: 'Phone', value: selected.phone || '—' },
                { icon: Calendar, label: 'Joined', value: formatDate(selected.joinDate) },
                { icon: Users, label: 'Department', value: selected.department },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-sm font-medium text-slate-800">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {['active', 'on-leave', 'inactive'].map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleStatus(selected, s)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${selected.status === s ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setConfirmRemove(selected)}
              className="w-full mt-5 py-2.5 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Remove from directory
            </button>
          </div>
        )}
      </Modal>

      {/* Add Staff Modal */}
      <Modal isOpen={!!addModal} onClose={() => setAddModal(null)} title="Add Staff Member" size="sm">
        {addModal && (
          <div className="p-5 space-y-3">
            {[
              { key: 'name', label: 'Full Name', placeholder: 'Jane Doe RN' },
              { key: 'email', label: 'Email', placeholder: 'jane@hospital.org' },
              { key: 'role', label: 'Role', placeholder: 'Registered Nurse' },
              { key: 'department', label: 'Department', placeholder: 'ICU' },
              { key: 'phone', label: 'Phone', placeholder: '+1 (555) 000-0000' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
                <input
                  type="text"
                  value={addModal[key]}
                  onChange={(e) => setAddModal((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAddModal(null)}
                disabled={saving}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveStaff}
                disabled={saving}
                className="flex-1 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Staff
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={removeStaff}
        title="Remove Staff Member"
        message={`Remove ${confirmRemove?.name} from the staff directory? This does not delete their login account.`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  )
}
