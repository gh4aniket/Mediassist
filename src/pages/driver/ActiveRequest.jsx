import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Phone, AlertTriangle, Navigation, CheckCircle, X, Ambulance, LocateFixed } from 'lucide-react'
import MapContainer from '../../components/shared/MapContainer'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import { PageLoader } from '../../components/shared/Loader'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import useGeolocation from '../../hooks/useGeolocation'
import useInterval from '../../hooks/useInterval'
import { bookingApi } from '../../services'

/** Cadence at which the driver's position is streamed onto the booking. */
const STREAM_MS = 10_000

export default function ActiveRequest() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { updateUser } = useAuth()
  const { position, error: geoError } = useGeolocation({ watch: true })

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmStart, setConfirmStart] = useState(false)
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

  /**
   * Stream this device's coordinates onto the booking. The patient's tracking
   * page polls the same booking every 10 s, so this is what moves their marker.
   */
  const streamLocation = useCallback(async () => {
    if (!booking?.id || !position) return
    try {
      const update = await bookingApi.pushDriverLocation(booking.id, {
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy,
        heading: position.heading,
        speed: position.speed,
      })
      setBooking((prev) => (prev ? { ...prev, ...update, driverLocation: update.driverLocation } : prev))
    } catch {
      /* transient — the next tick retries */
    }
  }, [booking?.id, position])

  useInterval(streamLocation, booking && position ? STREAM_MS : null, { immediate: true })

  const markers = useMemo(() => {
    if (!booking) return []
    const pins = []
    const me = position || booking.driverLocation
    if (me?.lat !== undefined) {
      pins.push({ lat: me.lat, lng: me.lng, type: 'ambulance', popup: 'Your location', label: 'You' })
    }
    const patient = booking.patientLocation || booking.coordinates
    if (patient?.lat !== undefined) {
      pins.push({ lat: patient.lat, lng: patient.lng, type: 'patient', popup: 'Patient pickup', label: 'Pickup' })
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

  const handleStartTrip = async () => {
    setConfirmStart(false)
    setBusy(true)
    try {
      // "En route" is the first move after accepting; the Trip screen drives the rest.
      if (booking.status === 'matched') {
        await bookingApi.setStatus(booking.id, 'en-route')
      }
      addToast('Trip started! Navigate to the patient location.', 'success')
      navigate('/driver/trip')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = async () => {
    setConfirmCancel(false)
    setBusy(true)
    try {
      await bookingApi.cancel(booking.id, 'Driver became unavailable')
      await updateUser({ assigned: false, availability: 'available' }, { local: true })
      addToast('Assignment released — the request is open to other drivers.', 'warning')
      navigate('/driver/home')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoader message="Loading your assignment..." />

  if (!booking) {
    return (
      <div className="p-6 max-w-md mx-auto mt-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Ambulance className="w-7 h-7 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-700 mb-1">No active assignment</h3>
        <p className="text-sm text-slate-500 mb-5">
          Go on duty from your home screen to start receiving dispatch requests.
        </p>
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
        <MapContainer center={center} zoom={14} markers={markers} className="h-72 lg:h-full rounded-none" />
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2 border border-slate-100">
          <p className="text-xs font-semibold text-slate-800">
            {booking.distance ? `${booking.distance} to pickup` : 'Calculating distance...'}
          </p>
          <p className="text-xs text-primary">{booking.eta ? `ETA ~${booking.eta}` : 'ETA pending'}</p>
        </div>
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur rounded-xl shadow px-3 py-1.5 flex items-center gap-2 border border-slate-100">
          <LocateFixed className={`w-3.5 h-3.5 ${position ? 'text-emerald-500' : 'text-slate-400'}`} />
          <p className="text-xs text-slate-600">
            {position ? 'Streaming your location to the patient' : geoError || 'Waiting for GPS...'}
          </p>
        </div>
      </div>

      {/* Detail Panel */}
      <div className="w-full lg:w-96 bg-white border-l border-slate-100 flex flex-col overflow-y-auto">
        <div className="p-5 border-b border-slate-50 bg-red-50">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-red-500 rounded-full live-pulse" />
            <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Active Assignment</span>
          </div>
          <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
            {booking.emergencyType}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">#{booking.id.slice(-6)}</p>
        </div>

        <div className="flex-1 p-5 space-y-4">
          {/* Pickup Location */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pickup Location</h3>
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{booking.pickupAddress}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {booking.distance || '—'}{booking.eta ? ` away · ETA ${booking.eta}` : ''}
                </p>
                <a
                  href={`https://www.openstreetmap.org/directions?to=${booking.coordinates?.lat},${booking.coordinates?.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-semibold"
                >
                  <Navigation className="w-3 h-3" /> Open in Maps
                </a>
              </div>
            </div>
          </div>

          {/* Patient Info */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Patient Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Name</span>
                <span className="text-xs font-semibold text-slate-800">{booking.patientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Phone</span>
                <a href={`tel:${booking.patientPhone}`} className="text-xs font-semibold text-primary flex items-center gap-1">
                  <Phone className="w-3 h-3" />{booking.patientPhone}
                </a>
              </div>
              {booking.hospital && (
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Destination</span>
                  <span className="text-xs font-semibold text-slate-800 text-right">{booking.hospital}</span>
                </div>
              )}
            </div>
          </div>

          {/* Medical Info */}
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Medical Information</h3>
            </div>
            {medical ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-amber-700">Blood Group</span>
                  <span className="text-xs font-bold text-red-700">{medical.bloodGroup || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-xs text-amber-700">Known Allergies:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {medical.allergies?.length ? (
                      medical.allergies.map((a) => (
                        <span key={a} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 font-medium">{a}</span>
                      ))
                    ) : (
                      <span className="text-xs text-amber-700">None on record</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-amber-700">Conditions:</span>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {medical.conditions?.length ? medical.conditions.join(', ') : 'None on record'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-800">
                This patient has not filled in a medical profile.
              </p>
            )}
          </div>

          {/* Emergency Note */}
          {booking.emergencyNote && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-red-700 mb-1">Emergency Note</p>
              <p className="text-sm text-red-800">{booking.emergencyNote}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-slate-50 space-y-2">
          <button
            onClick={() => setConfirmStart(true)}
            disabled={busy}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            <CheckCircle className="w-5 h-5" />
            {booking.status === 'matched' ? 'Start Driving — Go En Route' : 'Continue Trip'}
          </button>
          <button
            onClick={() => setConfirmCancel(true)}
            disabled={busy}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" /> Release Assignment
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmStart}
        onClose={() => setConfirmStart(false)}
        onConfirm={handleStartTrip}
        loading={busy}
        title="Start Trip?"
        message="The patient will see you as en route and your live position will move on their map."
        confirmLabel="Confirm & Start Trip"
      />
      <ConfirmDialog
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
        loading={busy}
        title="Release Assignment?"
        message="The request goes back into the queue for other available drivers, and you return to the dispatch feed. Only do this if you genuinely cannot complete the pickup."
        confirmLabel="Release Assignment"
        variant="danger"
      />
    </div>
  )
}
