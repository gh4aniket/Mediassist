import { useCallback, useState } from 'react'
import { Search, Filter, Ambulance, Clock, MapPin, Phone, ChevronRight, AlertCircle } from 'lucide-react'
import StatusBadge from '../../components/shared/StatusBadge'
import Modal from '../../components/shared/Modal'
import Timeline from '../../components/shared/Timeline'
import EmptyState from '../../components/shared/EmptyState'
import { SkeletonCard } from '../../components/shared/Loader'
import useApiResource from '../../hooks/useApiResource'
import { bookingApi } from '../../services'

const STATUSES = ['all', 'completed', 'en-route', 'matched', 'arrived', 'pending', 'cancelled']

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function RequestHistory() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  const fetchBookings = useCallback(
    (signal) => bookingApi.list({ status: statusFilter, q: query || undefined }, { signal }),
    [statusFilter, query],
  )

  const { data, loading, error } = useApiResource(fetchBookings, [statusFilter, query])
  const requests = data || []

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="mb-5 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ID, location, hospital..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${showFilters ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>

        {showFilters && (
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800">{requests.length}</span> request{requests.length !== 1 ? 's' : ''}
        </p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
          <AlertCircle className="w-7 h-7 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-red-800 mb-1">Could not load your history</p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      ) : loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>
      ) : requests.length === 0 ? (
        <EmptyState preset="requests" />
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
              onClick={() => setSelected(req)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Ambulance className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
                      {formatDate(req.createdAt)}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">#{req.id.slice(-6)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={req.status} />
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 leading-snug">{req.pickupLocation?.address || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-600">
                    {formatTime(req.createdAt)}{req.hospital ? ` · ${req.hospital}` : ''}
                  </p>
                </div>
                {req.driver && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <p className="text-xs text-slate-600">{req.driver.name} — {req.driver.vehicleId}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Request Details" size="md">
        {selected && (
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge status={selected.status} />
              <span className="text-xs text-slate-400 font-mono">#{selected.id.slice(-6)}</span>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              {[
                { label: 'Date & Time', value: `${formatDate(selected.createdAt)} at ${formatTime(selected.createdAt)}` },
                { label: 'Pickup Address', value: selected.pickupLocation?.address || '—' },
                { label: 'Emergency Type', value: selected.emergencyType || '—' },
                { label: 'Hospital', value: selected.hospital || '—' },
                { label: 'Driver', value: selected.driver ? `${selected.driver.name} (${selected.driver.vehicleId})` : '—' },
                { label: 'Emergency Note', value: selected.emergencyNote || 'None' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-slate-800">{value}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Status Timeline</h3>
              <Timeline currentStatus={selected.status} timeline={selected.timeline} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
