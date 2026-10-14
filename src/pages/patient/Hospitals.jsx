import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, ChevronDown, MapPin, Phone, Clock, Star, CheckCircle, ArrowUpDown, AlertCircle } from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import { SkeletonCard } from '../../components/shared/Loader'
import useApiResource from '../../hooks/useApiResource'
import useGeolocation from '../../hooks/useGeolocation'
import { hospitalApi } from '../../services'

function relativeUpdate(iso) {
  if (!iso) return 'unknown'
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function BedChip({ label, available, color }) {
  const colors = {
    icu: 'bg-red-50 text-red-700 border-red-100',
    general: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    emergency: 'bg-amber-50 text-amber-700 border-amber-100',
  }
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-xl border ${colors[color]}`}>
      <span className="text-base font-bold">{available}</span>
      <span className="text-xs opacity-70">{label}</span>
    </div>
  )
}

function HospitalCard({ hospital, onClick }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-bold text-slate-900 truncate" style={{ fontFamily: 'var(--font-display)' }}>
              {hospital.name}
            </h3>
            {hospital.verified && <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{hospital.type}</span>
            {hospital.distance && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                {hospital.distance} away
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-sm font-semibold text-slate-700">{hospital.rating}</span>
        </div>
      </div>

      <div className="space-y-1.5 mb-4">
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-snug">{hospital.address}</p>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <p className="text-xs text-slate-600">{hospital.phone}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <BedChip label="ICU" available={hospital.beds?.icu?.available ?? 0} color="icu" />
        <BedChip label="General" available={hospital.beds?.general?.available ?? 0} color="general" />
        <BedChip label="Emergency" available={hospital.beds?.emergency?.available ?? 0} color="emergency" />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {(hospital.services || []).slice(0, 4).map((s) => (
          <span key={s} className="text-xs bg-slate-50 text-slate-600 border border-slate-100 px-2 py-0.5 rounded-full">{s}</span>
        ))}
        {(hospital.services?.length || 0) > 4 && (
          <span className="text-xs bg-slate-50 text-slate-400 border border-slate-100 px-2 py-0.5 rounded-full">
            +{hospital.services.length - 4} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          <span>Updated {relativeUpdate(hospital.lastUpdated)}</span>
        </div>
        <button
          onClick={() => onClick(hospital.id)}
          className="text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 px-4 py-2 rounded-lg transition-colors"
        >
          View Hospital →
        </button>
      </div>
    </div>
  )
}

export default function Hospitals() {
  const navigate = useNavigate()
  const { position } = useGeolocation()

  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('rating')
  const [filterType, setFilterType] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // Filtering, sorting and distance all happen server-side so the list stays
  // correct even once there are more hospitals than fit in one response.
  const fetchHospitals = useCallback(
    (signal) =>
      hospitalApi.list(
        {
          q: query || undefined,
          type: filterType,
          sort: sortBy,
          lat: position?.lat,
          lng: position?.lng,
        },
        { signal },
      ),
    [query, filterType, sortBy, position?.lat, position?.lng],
  )

  const { data: hospitals, loading, error } = useApiResource(fetchHospitals, [
    query,
    filterType,
    sortBy,
    position?.lat,
    position?.lng,
  ])

  const list = hospitals || []
  const types = useMemo(() => ['all', ...new Set(list.map((h) => h.type).filter(Boolean))], [list])

  const sortOptions = [
    { value: 'rating', label: 'Highest Rated' },
    ...(position ? [{ value: 'distance', label: 'Nearest to me' }] : []),
    { value: 'icu', label: 'ICU Beds Available' },
    { value: 'general', label: 'General Beds Available' },
    { value: 'name', label: 'Name A–Z' },
  ]

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-5 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search hospitals by name or location..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${showFilters ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="bg-white rounded-xl border border-slate-100 p-4 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Hospital Type</label>
              <div className="flex flex-wrap gap-2">
                {types.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors capitalize ${filterType === t ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Sort By</label>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"
                >
                  {sortOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{list.length}</span> hospital{list.length !== 1 ? 's' : ''} found
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sorted by {sortOptions.find((o) => o.value === sortBy)?.label.toLowerCase()}
          </div>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
          <AlertCircle className="w-7 h-7 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-red-800 mb-1">Could not load hospitals</p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      ) : loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState preset="search" desc="No hospitals match your search. Try different keywords." />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((h) => (
            <HospitalCard key={h.id} hospital={h} onClick={(id) => navigate(`/patient/hospitals/${id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
