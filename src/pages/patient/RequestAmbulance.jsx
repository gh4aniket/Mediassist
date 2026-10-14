import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, AlertCircle, Ambulance, CheckCircle, Phone, Loader2, LocateFixed } from 'lucide-react'
import MapContainer from '../../components/shared/MapContainer'
import Modal from '../../components/shared/Modal'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import useGeolocation from '../../hooks/useGeolocation'
import useInterval from '../../hooks/useInterval'
import { bookingApi, hospitalApi } from '../../services'

const FALLBACK_CENTER = { lat: 42.3601, lng: -71.0589 }

/** How often we re-check whether a driver has picked the request up. */
const MATCH_POLL_MS = 5000

const states = { idle: 'idle', confirming: 'confirming', searching: 'searching', matched: 'matched' }

export default function RequestAmbulance() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()

  const { position, error: geoError, loading: locating, locate } = useGeolocation()

  const [state, setState] = useState(states.idle)
  const [address, setAddress] = useState(user?.address || '')
  const [note, setNote] = useState('')
  const [emergencyType, setEmergencyType] = useState('Medical Emergency')
  const [hospitalId, setHospitalId] = useState('')
  const [hospitals, setHospitals] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState(null)
  const [driversNotified, setDriversNotified] = useState(null)

  // Redirect straight to tracking if a ride is already in flight.
  useEffect(() => {
    let cancelled = false
    bookingApi
      .active()
      .then((active) => {
        if (cancelled || !active) return
        addToast('You already have an active request — showing live tracking.', 'info')
        navigate('/patient/live-tracking', { replace: true })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [navigate, addToast])

  useEffect(() => {
    let cancelled = false
    hospitalApi
      .list({ sort: 'rating' })
      .then((list) => !cancelled && setHospitals(list))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const pickup = position || FALLBACK_CENTER
  const hasFix = Boolean(position)

  const selectedHospital = hospitals.find((h) => h.id === hospitalId)

  const markers = useMemo(() => {
    const pins = [
      {
        lat: pickup.lat,
        lng: pickup.lng,
        type: 'pickup',
        popup: hasFix ? 'Your live location' : 'Approximate location',
        label: 'You',
      },
    ]
    if (selectedHospital?.coordinates) {
      pins.push({
        ...selectedHospital.coordinates,
        type: 'hospital',
        popup: selectedHospital.name,
        label: 'Destination',
      })
    }
    return pins
  }, [pickup.lat, pickup.lng, hasFix, selectedHospital])

  const handleRequest = () => {
    if (!hasFix) {
      setError('We need your live location before dispatching. Allow location access and try again.')
      return
    }
    if (!address.trim()) {
      setError('Add a pickup address so the driver knows where to look for you')
      return
    }
    setError('')
    setState(states.confirming)
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    setError('')
    try {
      const { data, meta } = await bookingApi.create({
        pickupLocation: { address: address.trim(), lat: pickup.lat, lng: pickup.lng },
        patientLocation: { lat: pickup.lat, lng: pickup.lng, accuracy: position?.accuracy },
        emergencyNote: note.trim(),
        emergencyType,
        hospitalId: hospitalId || undefined,
      })
      setBooking(data)
      setDriversNotified(meta?.driversNotified ?? null)
      setState(states.searching)
    } catch (err) {
      setState(states.idle)
      setError(err.message)
      addToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  /** Poll until a driver accepts; the modal swaps to the matched card. */
  const pollForMatch = useCallback(async () => {
    if (!booking?.id) return
    try {
      const status = await bookingApi.track(booking.id)
      if (status.driver && status.status !== 'pending') {
        setBooking((prev) => ({ ...prev, ...status }))
        setState(states.matched)
      }
    } catch {
      /* transient — the next tick will retry */
    }
  }, [booking?.id])

  useInterval(pollForMatch, state === states.searching ? MATCH_POLL_MS : null)

  const cancelSearch = async () => {
    if (!booking?.id) return
    try {
      await bookingApi.cancel(booking.id, 'Cancelled while searching for a driver')
      addToast('Request cancelled.', 'info')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setBooking(null)
      setState(states.idle)
    }
  }

  const handleTrack = () => {
    addToast('Ambulance dispatched! Tracking live.', 'success')
    navigate('/patient/live-tracking')
  }

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Map */}
      <div className="flex-1 relative min-h-64 lg:min-h-0">
        <MapContainer
          center={[pickup.lat, pickup.lng]}
          zoom={15}
          markers={markers}
          className="h-64 lg:h-full rounded-none"
        />
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2 border border-slate-100">
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 ${hasFix ? 'text-red-500' : 'text-slate-400'}`} />
            <div>
              <p className="text-xs font-semibold text-slate-800">
                {hasFix ? 'Live pickup location' : 'Locating you...'}
              </p>
              <p className="text-xs text-slate-500 max-w-48 truncate">
                {hasFix
                  ? `${pickup.lat.toFixed(5)}, ${pickup.lng.toFixed(5)}`
                  : 'Allow location access for accurate dispatch'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-full lg:w-96 bg-white border-l border-slate-100 flex flex-col overflow-y-auto">
        <div className="p-5 border-b border-slate-50">
          <h2 className="text-base font-bold text-slate-900 mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>
            Request Ambulance
          </h2>
          <p className="text-xs text-slate-500">Fill in details and we'll dispatch immediately</p>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Live location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Pickup Location
            </label>

            <button
              type="button"
              onClick={locate}
              disabled={locating}
              className="w-full flex items-center gap-2 p-3 mb-2 bg-cyan-50 border border-cyan-200 rounded-xl text-left hover:bg-cyan-100 transition-colors disabled:opacity-60"
            >
              {locating ? (
                <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin" />
              ) : (
                <LocateFixed className="w-4 h-4 text-primary shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800">
                  {locating ? 'Getting your position...' : 'Use my current location'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {hasFix
                    ? `Accurate to ~${Math.round(position.accuracy || 0)} m`
                    : 'Tap to retry location access'}
                </p>
              </div>
            </button>

            <input
              type="text"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setError('') }}
              placeholder="Street, building, landmark..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />

            {geoError && (
              <p className="mt-1.5 text-xs text-amber-600 flex items-start gap-1">
                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />{geoError}
              </p>
            )}
            {error && (
              <p className="mt-1.5 text-xs text-red-600 flex items-start gap-1">
                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />{error}
              </p>
            )}
          </div>

          {/* Emergency type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Emergency Type
            </label>
            <select
              value={emergencyType}
              onChange={(e) => setEmergencyType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              {['Medical Emergency', 'Cardiac Emergency', 'Trauma / Accident', 'Respiratory Distress', 'Allergic Reaction', 'Stroke', 'Maternity'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Destination hospital */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Destination <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <select
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              <option value="">Nearest hospital with an emergency bed</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} — {h.beds?.emergency?.available ?? 0} ER beds
                </option>
              ))}
            </select>
          </div>

          {/* Emergency Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Emergency Note <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="Describe the emergency briefly — e.g., chest pain, difficulty breathing..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <p className="text-xs text-slate-400 mt-1">{note.length}/200 characters</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <p className="text-base font-bold text-slate-800">{hasFix ? 'Ready' : 'Waiting'}</p>
              <p className="text-xs text-slate-500">GPS Fix</p>
            </div>
            <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-3 text-center">
              <p className="text-base font-bold text-slate-800 truncate">
                {selectedHospital ? selectedHospital.name.split(' ')[0] : 'Nearest'}
              </p>
              <p className="text-xs text-slate-500">Destination</p>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-50">
          <button
            onClick={handleRequest}
            disabled={locating}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-200 text-sm disabled:opacity-60"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <Ambulance className="w-5 h-5" />
            Request Ambulance Now
          </button>
          <p className="text-center text-xs text-slate-400 mt-2">
            For life-threatening emergencies, always call your local emergency number
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={state === states.confirming} onClose={() => setState(states.idle)} title="Confirm Request" size="sm">
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <InfoRow label="Pickup Location" value={address} />
            <InfoRow label="Coordinates" value={`${pickup.lat.toFixed(5)}, ${pickup.lng.toFixed(5)}`} />
            <InfoRow label="Emergency Type" value={emergencyType} />
            <InfoRow
              label="Destination"
              value={selectedHospital?.name || 'Nearest hospital with an emergency bed'}
            />
            {note && <InfoRow label="Emergency Note" value={note} />}
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Every available ambulance driver will be alerted immediately.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setState(states.idle)}
              disabled={submitting}
              className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Dispatching...' : 'Confirm & Dispatch'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Searching Modal */}
      <Modal isOpen={state === states.searching} onClose={() => {}} size="sm" hideClose>
        <div className="p-8 text-center">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div className="relative w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <Ambulance className="w-9 h-9 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Finding Nearest Ambulance
          </h3>
          <p className="text-sm text-slate-500">
            {driversNotified === 0
              ? 'No drivers are on duty right now — we will keep your request open.'
              : `${driversNotified ?? 'All available'} driver${driversNotified === 1 ? '' : 's'} alerted. Waiting for one to accept...`}
          </p>
          <div className="flex justify-center gap-1 mt-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={cancelSearch}
              className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200 transition-colors"
            >
              Cancel Request
            </button>
            <button
              onClick={handleTrack}
              className="flex-1 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary-dark transition-colors"
            >
              Track Live
            </button>
          </div>
        </div>
      </Modal>

      {/* Matched Modal */}
      <Modal isOpen={state === states.matched} onClose={() => {}} size="sm" hideClose>
        <div className="p-6">
          <div className="text-center mb-5">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>Ambulance Matched!</h3>
            <p className="text-sm text-slate-500 mt-1">Your driver is on the way</p>
          </div>

          {booking?.driver && (
            <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 mb-4">
              {booking.driver.avatar ? (
                <img src={booking.driver.avatar} alt="" className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-xl font-bold text-slate-500">
                  {booking.driver.name?.[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{booking.driver.name}</p>
                <p className="text-xs text-slate-500">
                  {booking.driver.vehicleId} · ★ {booking.driver.rating}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-primary">{booking.eta || '—'}</p>
                <p className="text-xs text-slate-500">ETA</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <a
              href={`tel:${booking?.driver?.phone || ''}`}
              className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
            >
              <Phone className="w-4 h-4" /> Call Driver
            </a>
            <button
              onClick={handleTrack}
              className="flex-1 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary-dark transition-colors"
            >
              Track Live
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  )
}
