import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Phone, Ambulance, CheckCircle, X, AlertCircle, LocateFixed } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import { useToast } from '../../context/ToastContext'
import useInterval from '../../hooks/useInterval'
import useGeolocation from '../../hooks/useGeolocation'
import { bookingApi, driverApi } from '../../services'

const AVAILABILITY = ['available', 'busy', 'offline']
const AVAIL_LABELS = { available: 'Available', busy: 'Busy', offline: 'Offline' }
const AVAIL_COLORS = {
  available: 'bg-emerald-500',
  busy: 'bg-amber-500',
  offline: 'bg-slate-400',
}

/** How often an on-duty driver refreshes the dispatch feed. */
const FEED_POLL_MS = 8000
/** How often an on-duty driver reports their position for distance estimates. */
const LOCATION_PUSH_MS = 15_000

export default function DriverHome() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { position, error: geoError } = useGeolocation({ watch: true })

  const [availability, setAvailability] = useState(user?.availability || 'offline')
  const [assigned, setAssigned] = useState(Boolean(user?.assigned))
  const [requests, setRequests] = useState([])
  const [feedNote, setFeedNote] = useState('')
  const [stats, setStats] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmAccept, setConfirmAccept] = useState(null)
  const [confirmReject, setConfirmReject] = useState(null)

  const onDuty = availability === 'available' && !assigned

  const loadStats = useCallback(async () => {
    try {
      const next = await driverApi.stats()
      setStats(next)
      setAvailability(next.availability)
      setAssigned(next.assigned)
    } catch {
      /* the header still renders from the cached user */
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  /** Poll the shared dispatch feed — every free driver sees the same requests. */
  const loadFeed = useCallback(async () => {
    try {
      const { data, meta } = await bookingApi.incoming()
      setRequests(data)
      setFeedNote(meta?.reason || '')
    } catch (err) {
      setFeedNote(err.message)
    }
  }, [])

  useInterval(loadFeed, onDuty ? FEED_POLL_MS : null, { immediate: true })

  useEffect(() => {
    if (!onDuty) setRequests([])
  }, [onDuty])

  /** Keep the server's idea of where we are fresh, for distance/ETA maths. */
  const pushLocation = useCallback(async () => {
    if (!position) return
    try {
      await driverApi.pushLocation({ lat: position.lat, lng: position.lng, accuracy: position.accuracy })
    } catch {
      /* best effort */
    }
  }, [position])

  useInterval(pushLocation, position && availability !== 'offline' ? LOCATION_PUSH_MS : null, {
    immediate: true,
  })

  const changeAvailability = async (next) => {
    const previous = availability
    setAvailability(next)
    try {
      const result = await driverApi.setAvailability(
        next,
        position ? { lat: position.lat, lng: position.lng } : undefined,
      )
      setAssigned(result.assigned)
      await updateUser({ availability: result.availability, assigned: result.assigned }, { local: true })
      if (next === 'available') loadFeed()
    } catch (err) {
      setAvailability(previous)
      addToast(err.message, 'error')
    }
  }

  const handleAccept = async () => {
    const request = confirmAccept
    setConfirmAccept(null)
    setBusy(true)
    try {
      await bookingApi.accept(
        request.id,
        position ? { lat: position.lat, lng: position.lng } : undefined,
      )
      addToast('Request accepted! Navigating to pickup.', 'success')
      setAssigned(true)
      setAvailability('busy')
      await updateUser({ availability: 'busy', assigned: true }, { local: true })
      navigate('/driver/active-request')
    } catch (err) {
      // Most often another driver got there first — refresh so it disappears.
      addToast(err.message, 'warning')
      loadFeed()
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async () => {
    const request = confirmReject
    setConfirmReject(null)
    setRequests((prev) => prev.filter((r) => r.id !== request.id))
    try {
      await bookingApi.reject(request.id)
      addToast('Request declined.', 'info')
    } catch (err) {
      addToast(err.message, 'error')
      loadFeed()
    }
  }

  const statTiles = [
    { label: 'Trips Today', value: stats?.tripsToday ?? 0 },
    { label: 'This Week', value: stats?.tripsThisWeek ?? 0 },
    { label: 'Rating', value: `${stats?.rating ?? 5}★` },
    { label: 'Acceptance', value: `${stats?.acceptanceRate ?? 100}%` },
  ]

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-3xl mx-auto">
      {/* Driver Status Card */}
      <div className="bg-gradient-to-r from-[#0c1220] to-[#0e3a52] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-40 h-40 bg-primary/20 rounded-full -translate-y-10 translate-x-10" />
        <div className="relative z-10">
          <div className="flex items-start gap-4 mb-5">
            <img src={user?.avatar} alt={user?.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20" />
            <div>
              <p className="text-slate-300 text-sm">Driver</p>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{user?.name}</h2>
              <p className="text-slate-300 text-xs">{user?.vehicleId}{user?.certifications ? ` · ${user.certifications}` : ''}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide font-medium">Availability Status</p>
            <div className="flex gap-2">
              {AVAILABILITY.map((a) => (
                <button
                  key={a}
                  onClick={() => changeAvailability(a)}
                  disabled={assigned && a === 'available'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    availability === a
                      ? 'border-white bg-white/20 text-white'
                      : 'border-white/20 text-white/60 hover:border-white/40 hover:text-white/80'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${AVAIL_COLORS[a]}`} />
                  {AVAIL_LABELS[a]}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
              <LocateFixed className={`w-3.5 h-3.5 ${position ? 'text-emerald-400' : 'text-slate-500'}`} />
              {position
                ? `Broadcasting position (±${Math.round(position.accuracy || 0)} m)`
                : geoError || 'Waiting for a GPS fix...'}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {statTiles.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-3 text-center shadow-sm">
            <p className="text-xl font-bold text-slate-800" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Active assignment shortcut */}
      {assigned && (
        <button
          onClick={() => navigate('/driver/active-request')}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Ambulance className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">You have an active assignment</p>
            <p className="text-xs text-slate-500">Open it to navigate and update the trip status</p>
          </div>
        </button>
      )}

      {/* Incoming Requests */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Incoming Requests</h2>
          {!onDuty && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              Set to Available to receive requests
            </span>
          )}
        </div>

        {!onDuty || requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center shadow-sm">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Ambulance className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-600">No incoming requests</p>
            <p className="text-xs text-slate-400 mt-1">
              {feedNote || "You'll be notified when a request comes in"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="bg-white rounded-2xl border-2 border-primary/20 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full live-pulse" />
                      <span className="text-xs font-bold text-red-600 uppercase tracking-wide">New Request</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
                      {req.emergencyType}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{req.eta || '—'}</p>
                    <p className="text-xs text-slate-400">to pickup</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-700 font-medium">{req.pickupAddress}</p>
                      <p className="text-xs text-slate-400">{req.distance ? `${req.distance} away` : 'Distance unavailable'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <p className="text-sm text-slate-600">{req.patientName} · {req.patientPhone}</p>
                  </div>
                  {req.emergencyNote && (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-lg flex-1">{req.emergencyNote}</p>
                    </div>
                  )}
                  {req.medicalInfo?.bloodGroup && (
                    <p className="text-xs text-slate-500">
                      Blood group <span className="font-bold text-red-600">{req.medicalInfo.bloodGroup}</span>
                      {req.medicalInfo.allergies?.length ? ` · allergic to ${req.medicalInfo.allergies.join(', ')}` : ''}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmReject(req)}
                    disabled={busy}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> Decline
                  </button>
                  <button
                    onClick={() => setConfirmAccept(req)}
                    disabled={busy}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" /> Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmAccept}
        onClose={() => setConfirmAccept(null)}
        onConfirm={handleAccept}
        loading={busy}
        title="Accept Request?"
        message={`Accept emergency pickup for ${confirmAccept?.patientName} at ${confirmAccept?.pickupAddress}? Other drivers can still take it until you confirm.`}
        confirmLabel="Accept & Navigate"
      />
      <ConfirmDialog
        isOpen={!!confirmReject}
        onClose={() => setConfirmReject(null)}
        onConfirm={handleReject}
        title="Decline Request?"
        message="This request stays open for other available drivers, and you will stop seeing it. Are you sure?"
        confirmLabel="Decline Request"
        variant="warning"
      />
    </div>
  )
}
