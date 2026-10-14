import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Clock, MapPin, ChevronDown, ChevronUp, Star, AlertCircle, Ambulance, WifiOff, XCircle } from 'lucide-react'
import MapContainer from '../../components/shared/MapContainer'
import Timeline from '../../components/shared/Timeline'
import StatusBadge from '../../components/shared/StatusBadge'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import { PageLoader } from '../../components/shared/Loader'
import useInterval from '../../hooks/useInterval'
import useGeolocation from '../../hooks/useGeolocation'
import { bookingApi } from '../../services'
import { useToast } from '../../context/ToastContext'

/** The patient re-polls the driver's position on this cadence. */
const TRACK_POLL_MS = 10_000
/** The patient's own position is reported less often — it barely moves. */
const SELF_REPORT_MS = 30_000

const CLOSED_STATUSES = ['completed', 'cancelled']

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function LiveTracking() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { position } = useGeolocation({ watch: true })

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pollError, setPollError] = useState('')
  const [timelineOpen, setTimelineOpen] = useState(true)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const lastStatus = useRef(null)

  // Initial load: find whichever booking is currently live for this patient.
  useEffect(() => {
    let cancelled = false
    bookingApi
      .active()
      .then((active) => {
        if (cancelled) return
        setBooking(active)
        lastStatus.current = active?.status || null
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  /** The 10-second poll: the driver's latest fix, ETA and status. */
  const poll = useCallback(async () => {
    if (!booking?.id) return
    try {
      const update = await bookingApi.track(booking.id)
      setPollError('')
      setBooking((prev) => ({ ...prev, ...update }))

      if (update.status !== lastStatus.current) {
        lastStatus.current = update.status
        if (update.status === 'arrived') addToast('Your ambulance has arrived!', 'success')
        if (update.status === 'completed') addToast('Trip completed. Take care!', 'success')
        if (update.status === 'cancelled') addToast('This request was cancelled.', 'warning')
      }
    } catch (err) {
      setPollError(err.message)
    }
  }, [booking?.id, addToast])

  const isLive = Boolean(booking?.id) && !CLOSED_STATUSES.includes(booking?.status)
  useInterval(poll, isLive ? TRACK_POLL_MS : null)

  /** Keep the driver's view of where we are current, too. */
  const reportSelf = useCallback(async () => {
    if (!booking?.id || !position || !isLive) return
    try {
      await bookingApi.pushPatientLocation(booking.id, {
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy,
      })
    } catch {
      /* best effort — the driver still has the pickup address */
    }
  }, [booking?.id, position, isLive])

  useInterval(reportSelf, isLive && position ? SELF_REPORT_MS : null, { immediate: true })

  const markers = useMemo(() => {
    if (!booking) return []
    const pins = []
    const patient = booking.patientLocation || booking.pickupLocation
    if (patient?.lat !== undefined) {
      pins.push({ lat: patient.lat, lng: patient.lng, type: 'patient', popup: 'Your location', label: 'You' })
    }
    if (booking.driverLocation?.lat !== undefined) {
      pins.push({
        lat: booking.driverLocation.lat,
        lng: booking.driverLocation.lng,
        type: 'ambulance',
        popup: booking.driver?.vehicleId || 'Ambulance',
        label: 'Ambulance',
      })
    }
    return pins
  }, [booking])

  const center = useMemo(() => {
    if (markers.length === 2) {
      return [(markers[0].lat + markers[1].lat) / 2, (markers[0].lng + markers[1].lng) / 2]
    }
    if (markers.length === 1) return [markers[0].lat, markers[0].lng]
    return [42.3601, -71.0589]
  }, [markers])

  const handleCancel = async () => {
    setConfirmCancel(false)
    try {
      const cancelled = await bookingApi.cancel(booking.id, 'Cancelled by patient')
      setBooking(cancelled)
      addToast('Request cancelled.', 'info')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  if (loading) return <PageLoader message="Locating your ambulance..." />

  if (error) {
    return (
      <div className="p-6 max-w-md mx-auto mt-10 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800 mb-1">Could not load tracking</p>
        <p className="text-xs text-slate-500">{error}</p>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="p-6 max-w-md mx-auto mt-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Ambulance className="w-7 h-7 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-700 mb-1">No active request</h3>
        <p className="text-sm text-slate-500 mb-5">
          When you request an ambulance, its live position will show up here.
        </p>
        <button
          onClick={() => navigate('/patient/request-ambulance')}
          className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
        >
          Request an Ambulance
        </button>
      </div>
    )
  }

  const waitingForDriver = booking.status === 'pending'

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Map */}
      <div className="flex-1 relative min-h-72 lg:min-h-0">
        <MapContainer center={center} zoom={14} markers={markers} className="h-72 lg:h-full rounded-none" />

        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-full shadow-lg px-3 py-1.5 flex items-center gap-2 border border-slate-100">
          {pollError ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Reconnecting</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 bg-red-500 rounded-full live-pulse" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Live</span>
            </>
          )}
        </div>

        {booking.eta && (
          <div className="absolute top-3 right-3 bg-primary text-white rounded-xl shadow-lg px-4 py-2 text-center">
            <p className="text-xl font-bold">{booking.eta}</p>
            <p className="text-xs opacity-80">ETA</p>
          </div>
        )}

        {booking.driverLocationStale && (
          <div className="absolute bottom-3 left-3 right-3 lg:right-auto bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800">
              Driver's last position was {booking.driverLocationAgeSeconds}s ago — their signal may be weak.
            </p>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="w-full lg:w-96 bg-white border-l border-slate-100 flex flex-col overflow-y-auto">
        {/* Status Header */}
        <div className="p-5 border-b border-slate-50">
          <div className="flex items-center justify-between mb-2">
            <StatusBadge status={booking.status} />
            <span className="text-xs text-slate-400 font-mono">#{booking.id.slice(-6)}</span>
          </div>
          <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
            {waitingForDriver ? 'Finding a Driver' : `Ambulance ${statusHeadline(booking.status)}`}
          </h2>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Request placed at {formatTime(booking.createdAt || booking.timeline?.[0]?.time)}</span>
          </div>
        </div>

        {/* Driver Card */}
        <div className="p-5 border-b border-slate-50">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Your Driver</h3>
          {booking.driver ? (
            <>
              <div className="flex items-center gap-4">
                {booking.driver.avatar ? (
                  <img src={booking.driver.avatar} alt="" className="w-14 h-14 rounded-xl object-cover border-2 border-slate-100" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
                    <span className="text-xl font-bold text-slate-400">{booking.driver.name?.[0]}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{booking.driver.name}</p>
                  <p className="text-xs text-slate-500">{booking.driver.vehicleId}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-medium text-slate-600">{booking.driver.rating}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <a
                  href={`tel:${booking.driver.phone}`}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
                >
                  <Phone className="w-4 h-4" /> Call
                </a>
                {booking.distance && (
                  <div className="flex-1 py-2.5 bg-primary/10 text-primary font-semibold rounded-xl flex items-center justify-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" /> {booking.distance} away
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-600">
                Every available driver has been alerted. We'll show their details the moment one accepts.
              </p>
            </div>
          )}
        </div>

        {/* Pickup info */}
        <div className="p-5 border-b border-slate-50">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pickup Location</h3>
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{booking.pickupLocation?.address || 'Your location'}</p>
              {booking.hospital && (
                <p className="text-xs text-slate-400 mt-0.5">Destination: {booking.hospital}</p>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="p-5">
          <button onClick={() => setTimelineOpen((v) => !v)} className="flex items-center justify-between w-full mb-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status Timeline</h3>
            {timelineOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {timelineOpen && <Timeline currentStatus={booking.status} timeline={booking.timeline} />}
        </div>

        {/* Emergency note */}
        {booking.emergencyNote && (
          <div className="mx-5 mb-5 p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 mb-1">Emergency Note</p>
            <p className="text-sm text-amber-800">{booking.emergencyNote}</p>
          </div>
        )}

        {/* Cancel */}
        {['pending', 'matched'].includes(booking.status) && (
          <div className="px-5 pb-5">
            <button
              onClick={() => setConfirmCancel(true)}
              className="w-full py-2.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-medium rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
            >
              <XCircle className="w-4 h-4" /> Cancel Request
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
        title="Cancel Request?"
        message="Your ambulance request will be withdrawn and the driver released. Only cancel if you no longer need transport."
        confirmLabel="Cancel Request"
        variant="danger"
      />
    </div>
  )
}

function statusHeadline(status) {
  return (
    {
      matched: 'Assigned',
      'en-route': 'En Route',
      arrived: 'Arrived',
      completed: 'Trip Complete',
      cancelled: 'Request Cancelled',
    }[status] || 'En Route'
  )
}
