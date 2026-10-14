import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, MapPin, AlertTriangle, Phone, Navigation, Ambulance, LocateFixed } from 'lucide-react'
import MapContainer from '../../components/shared/MapContainer'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import StatusBadge from '../../components/shared/StatusBadge'
import { PageLoader } from '../../components/shared/Loader'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import useGeolocation from '../../hooks/useGeolocation'
import useInterval from '../../hooks/useInterval'
import { bookingApi } from '../../services'

const WORKFLOW = [
  { key: 'matched', label: 'Matched' },
  { key: 'en-route', label: 'En Route' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'completed', label: 'Completed' },
]

const NEXT_ACTIONS = {
  matched: { label: 'Start Driving → En Route', next: 'en-route', color: 'bg-cyan-600 hover:bg-cyan-700' },
  'en-route': { label: 'Arrived at Location', next: 'arrived', color: 'bg-purple-600 hover:bg-purple-700' },
  arrived: { label: 'Complete Trip — Patient Delivered', next: 'completed', color: 'bg-emerald-600 hover:bg-emerald-700' },
  completed: null,
}

const CONFIRM_COPY = {
  'en-route': 'Confirm you are now driving to the patient location.',
  arrived: 'Confirm that you have arrived at the patient pickup location.',
  completed: 'Confirm that the patient has been safely delivered to the hospital.',
}

/** Cadence at which the driver's position is streamed onto the booking. */
const STREAM_MS = 10_000

export default function Trip() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { updateUser } = useAuth()
  const { position, error: geoError } = useGeolocation({ watch: true })

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmNext, setConfirmNext] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    bookingApi
      .active()
      .then((active) => !cancelled && setBooking(active))
      .catch((err) => !cancelled && addToast(err.message, 'error'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [addToast])

  const streamLocation = useCallback(async () => {
    if (!booking?.id || !position || booking.status === 'completed') return
    try {
      const update = await bookingApi.pushDriverLocation(booking.id, {
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy,
        heading: position.heading,
        speed: position.speed,
      })
      setBooking((prev) => (prev ? { ...prev, ...update } : prev))
    } catch {
      /* transient — the next tick retries */
    }
  }, [booking?.id, booking?.status, position])

  useInterval(
    streamLocation,
    booking && position && booking.status !== 'completed' ? STREAM_MS : null,
    { immediate: true },
  )

  const tripStatus = booking?.status || 'matched'
  const nextAction = NEXT_ACTIONS[tripStatus]
  const currentStepIdx = WORKFLOW.findIndex((w) => w.key === tripStatus)

  const markers = useMemo(() => {
    if (!booking) return []
    const pins = []
    const me = position || booking.driverLocation
    if (me?.lat !== undefined) {
      pins.push({ lat: me.lat, lng: me.lng, type: 'ambulance', popup: 'Ambulance', label: 'You' })
    }
    const patient = booking.patientLocation || booking.coordinates
    if (patient?.lat !== undefined) {
      pins.push({ lat: patient.lat, lng: patient.lng, type: 'patient', popup: 'Patient', label: 'Patient' })
    }
    return pins
  }, [booking, position])

  const center = useMemo(() => {
    if (markers.length === 2) {
      return [(markers[0].lat + markers[1].lat) / 2, (markers[0].lng + markers[1].lng) / 2]
    }
    if (markers.length === 1) return [markers[0].lat, markers[0].lng]
    return [42.3601, -71.0589]
  }, [markers])

  const advanceStatus = async () => {
    if (!nextAction) return
    setConfirmNext(false)
    setBusy(true)
    try {
      const updated = await bookingApi.setStatus(booking.id, nextAction.next)
      setBooking(updated)
      if (nextAction.next === 'completed') {
        // Completion frees the driver server-side; mirror that in the cached user.
        await updateUser({ assigned: false, availability: 'available' }, { local: true })
        addToast('Trip completed! Patient delivered safely.', 'success')
      } else {
        addToast(`Status updated to ${WORKFLOW.find((w) => w.key === nextAction.next)?.label}.`, 'info')
      }
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoader message="Loading your trip..." />

  if (!booking) {
    return (
      <div className="p-6 max-w-md mx-auto mt-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Ambulance className="w-7 h-7 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-700 mb-1">No trip in progress</h3>
        <p className="text-sm text-slate-500 mb-5">Accept a dispatch request to start a trip.</p>
        <button
          onClick={() => navigate('/driver/home')}
          className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
        >
          Back to Driver Home
        </button>
      </div>
    )
  }

  const medical = booking.medicalInfo

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Map */}
      <div className="flex-1 relative min-h-72 lg:min-h-0">
        <MapContainer center={center} zoom={13} markers={markers} className="h-72 lg:h-full rounded-none" />
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-xl shadow-lg px-4 py-2 border border-slate-100">
          <StatusBadge status={tripStatus} />
        </div>
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur rounded-xl shadow px-3 py-1.5 flex items-center gap-2 border border-slate-100">
          <LocateFixed className={`w-3.5 h-3.5 ${position ? 'text-emerald-500' : 'text-slate-400'}`} />
          <p className="text-xs text-slate-600">
            {booking.status === 'completed'
              ? 'Location streaming stopped'
              : position
                ? 'Streaming your location to the patient'
                : geoError || 'Waiting for GPS...'}
          </p>
        </div>
      </div>

      {/* Trip Panel */}
      <div className="w-full lg:w-96 bg-white border-l border-slate-100 flex flex-col overflow-y-auto">
        <div className="p-5 border-b border-slate-50">
          <h2 className="text-base font-bold text-slate-900 mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>Active Trip</h2>
          <p className="text-xs text-slate-500 font-mono">#{booking.id.slice(-6)} · {booking.emergencyType}</p>
        </div>

        <div className="flex-1 p-5 space-y-4">
          {/* Progress */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Trip Progress</h3>
            <div className="flex items-center gap-0">
              {WORKFLOW.map((step, idx) => {
                const isActive = step.key === tripStatus
                const isDone = idx < currentStepIdx
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-bold ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : isActive ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-300'}`}>
                        {isDone ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className={`text-xs text-center leading-tight ${isActive ? 'text-primary font-semibold' : isDone ? 'text-emerald-600' : 'text-slate-300'}`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < WORKFLOW.length - 1 && (
                      <div className={`h-0.5 flex-1 mb-5 ${isDone ? 'bg-emerald-300' : 'bg-slate-100'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Location */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 bg-cyan-100 rounded-lg flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Pickup</p>
                <p className="text-sm font-medium text-slate-800">{booking.pickupAddress}</p>
                {booking.eta && <p className="text-xs text-primary mt-0.5">ETA {booking.eta} · {booking.distance}</p>}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                <Navigation className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Destination</p>
                <p className="text-sm font-medium text-slate-800">{booking.hospital || 'Nearest hospital'}</p>
              </div>
            </div>
          </div>

          {/* Patient Medical Info */}
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Patient Medical Info</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-amber-600">Blood Group</p>
                <p className="font-bold text-red-700">{medical?.bloodGroup || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-amber-600">Name</p>
                <p className="font-semibold text-slate-800">{booking.patientName}</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-amber-600 mb-1">Allergies</p>
              <div className="flex flex-wrap gap-1">
                {medical?.allergies?.length ? (
                  medical.allergies.map((a) => (
                    <span key={a} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 font-medium">{a}</span>
                  ))
                ) : (
                  <span className="text-xs text-amber-800">None on record</span>
                )}
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-amber-600 mb-0.5">Conditions</p>
              <p className="text-xs text-amber-800">
                {medical?.conditions?.length ? medical.conditions.join(' · ') : 'None on record'}
              </p>
            </div>
            <a href={`tel:${booking.patientPhone}`} className="mt-3 flex items-center gap-1.5 text-xs text-primary font-semibold">
              <Phone className="w-3.5 h-3.5" /> {booking.patientPhone}
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-slate-50 space-y-2">
          {tripStatus === 'completed' ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-emerald-700 mb-1">Trip Completed!</p>
              <p className="text-xs text-slate-500 mb-4">
                Patient delivered safely. You are back on duty and will receive new requests.
              </p>
              <button
                onClick={() => navigate('/driver/home')}
                className="w-full py-2.5 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary-dark transition-colors"
              >
                Return Home
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmNext(true)}
              disabled={busy || !nextAction}
              className={`w-full py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors shadow-lg disabled:opacity-50 ${nextAction?.color}`}
            >
              <CheckCircle className="w-5 h-5" /> {nextAction?.label}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmNext}
        onClose={() => setConfirmNext(false)}
        onConfirm={advanceStatus}
        loading={busy}
        title={`Confirm: ${nextAction?.label || ''}`}
        message={CONFIRM_COPY[nextAction?.next] || 'Confirm this status change.'}
        confirmLabel="Confirm"
      />
    </div>
  )
}
