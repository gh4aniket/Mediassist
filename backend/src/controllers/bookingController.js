import Booking, { ACTIVE_STATUSES } from '../models/Booking.js'
import User from '../models/User.js'
import Hospital from '../models/Hospital.js'
import MedicalProfile from '../models/MedicalProfile.js'
import Activity from '../models/Activity.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import env from '../config/env.js'
import { distanceKm, formatDistance, formatEta, normalisePoint } from '../utils/geo.js'

/** Forward-only status machine. `cancelled` is reachable from any live state. */
const NEXT_STATUS = {
  pending: ['matched', 'cancelled'],
  matched: ['en-route', 'cancelled'],
  'en-route': ['arrived', 'cancelled'],
  arrived: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

const STATUS_DESCRIPTIONS = {
  pending: 'Request submitted',
  matched: 'Ambulance assigned',
  'en-route': 'Driver en route to your location',
  arrived: 'Ambulance arrived at pickup location',
  completed: 'Patient transported safely to hospital',
  cancelled: 'Request cancelled',
}

async function findBookingOr404(id) {
  const booking = await Booking.findById(id)
  if (!booking) throw ApiError.notFound('Booking not found')
  return booking
}

/** A booking is visible to its patient, its driver, and its destination hospital. */
function assertCanView(user, booking) {
  const isPatient = String(booking.patientId) === String(user._id)
  const isDriver = booking.driverId && String(booking.driverId) === String(user._id)
  const isHospitalStaff =
    user.role === 'hospital' &&
    booking.hospitalId &&
    String(booking.hospitalId) === String(user.hospitalId)

  if (!isPatient && !isDriver && !isHospitalStaff) {
    throw ApiError.forbidden('This booking is not yours to view')
  }
  return { isPatient, isDriver, isHospitalStaff }
}

/** Picks a destination when the patient did not choose one explicitly. */
async function chooseDestinationHospital(pickup, preferredId) {
  if (preferredId) {
    const hospital = await Hospital.findById(preferredId)
    if (hospital) return hospital
  }

  const candidates = await Hospital.find({
    'settings.publicListing': { $ne: false },
    'beds.emergency.available': { $gt: 0 },
  })
  const pool = candidates.length
    ? candidates
    : await Hospital.find({ 'settings.publicListing': { $ne: false } })

  let best = null
  let bestKm = Infinity
  for (const hospital of pool) {
    if (!hospital.coordinates) continue
    const km = distanceKm(pickup, hospital.coordinates)
    if (km !== null && km < bestKm) {
      bestKm = km
      best = hospital
    }
  }
  return best || pool[0] || null
}

/**
 * Drivers eligible to receive a new request: on duty and not already committed
 * to a ride. Deliberately not a geospatial query — every free driver sees it.
 */
function availableDriverFilter(excludeIds = []) {
  const filter = { role: 'driver', availability: 'available', assigned: false }
  if (excludeIds.length) filter._id = { $nin: excludeIds }
  return filter
}

/**
 * POST /api/bookings
 * Body: { pickupLocation: { address, lat, lng }, patientLocation?, emergencyNote?,
 *         emergencyType?, hospitalId? }
 */
export const createBooking = asyncHandler(async (req, res) => {
  if (req.user.role !== 'patient') {
    throw ApiError.forbidden('Only patients can request an ambulance')
  }

  const existing = await Booking.findOne({
    patientId: req.user._id,
    status: { $in: ACTIVE_STATUSES },
  })
  if (existing) {
    throw ApiError.conflict(
      'You already have an active ambulance request. Track or cancel it before creating another.',
    )
  }

  const pickupInput = req.body.pickupLocation || req.body
  const pickupPoint = normalisePoint(pickupInput)
  if (!pickupPoint) {
    throw ApiError.badRequest(
      'A pickup location with valid coordinates is required. Allow location access or pick a point on the map.',
      { pickupLocation: 'Valid lat/lng required' },
    )
  }

  const hospital = await chooseDestinationHospital(pickupPoint, req.body.hospitalId)
  const patientLocation = normalisePoint(req.body.patientLocation) || pickupPoint

  const booking = new Booking({
    patientId: req.user._id,
    patientSnapshot: {
      name: req.user.name,
      phone: req.user.phone,
      avatar: req.user.avatar,
    },
    pickupLocation: {
      address: String(pickupInput.address || req.user.address || '').trim(),
      lat: pickupPoint.lat,
      lng: pickupPoint.lng,
    },
    patientLocation: { ...patientLocation, updatedAt: new Date() },
    hospitalId: hospital?._id || null,
    hospitalName: hospital?.name || null,
    emergencyType: req.body.emergencyType || 'Medical Emergency',
    emergencyNote: req.body.emergencyNote || '',
    status: 'pending',
  })
  booking.pushTimeline('pending', STATUS_DESCRIPTIONS.pending)
  await booking.save()

  // Fan out: mark every free driver as having been offered this request. The
  // drivers poll GET /api/bookings/incoming, so there is nothing to push.
  const notified = await User.countDocuments(availableDriverFilter())
  await User.updateMany(availableDriverFilter(), { $inc: { 'stats.offeredCount': 1 } })

  await Activity.record({
    scope: 'patient',
    userId: req.user._id,
    type: 'request',
    icon: 'ambulance',
    message: `Ambulance requested — ${hospital?.name || 'nearest hospital'}`,
  })

  res.status(201).json({
    success: true,
    data: booking.toPatientView(),
    meta: { driversNotified: notified },
  })
})

/**
 * GET /api/bookings
 * Role-scoped history. Query: status, q, limit.
 */
export const listBookings = asyncHandler(async (req, res) => {
  const { status, q, limit } = req.query
  const filter = {}

  if (req.user.role === 'patient') filter.patientId = req.user._id
  else if (req.user.role === 'driver') filter.driverId = req.user._id
  else if (req.user.role === 'hospital') {
    if (!req.user.hospitalId) {
      return res.json({ success: true, count: 0, data: [] })
    }
    filter.hospitalId = req.user.hospitalId
  }

  if (status && status !== 'all') filter.status = status

  const max = Math.min(Number(limit) || 50, 200)
  let bookings = await Booking.find(filter).sort({ createdAt: -1 }).limit(max)

  let data = bookings.map((b) => b.toPatientView())

  if (q) {
    const needle = String(q).toLowerCase()
    data = data.filter(
      (b) =>
        b.id.toLowerCase().includes(needle) ||
        (b.pickupLocation.address || '').toLowerCase().includes(needle) ||
        (b.hospital || '').toLowerCase().includes(needle),
    )
  }

  res.json({ success: true, count: data.length, data })
})

/** GET /api/bookings/active — the caller's single in-flight booking, or null. */
export const getActiveBooking = asyncHandler(async (req, res) => {
  const filter = { status: { $in: ACTIVE_STATUSES } }
  if (req.user.role === 'patient') filter.patientId = req.user._id
  else if (req.user.role === 'driver') filter.driverId = req.user._id
  else throw ApiError.forbidden('Only patients and drivers have an active booking')

  const booking = await Booking.findOne(filter).sort({ createdAt: -1 })
  if (!booking) return res.json({ success: true, data: null })

  if (req.user.role === 'driver') {
    const medicalInfo = await responderMedicalInfo(booking.patientId)
    return res.json({
      success: true,
      data: booking.toDriverView(req.user.currentLocation, medicalInfo),
    })
  }

  res.json({ success: true, data: booking.toPatientView() })
})

/**
 * GET /api/bookings/incoming
 * Every pending request, offered to every free driver at once. A driver who is
 * offline, busy or already assigned gets an empty list.
 */
export const listIncomingBookings = asyncHandler(async (req, res) => {
  if (req.user.role !== 'driver') {
    throw ApiError.forbidden('Only drivers have an incoming request feed')
  }

  if (req.user.availability !== 'available' || req.user.assigned) {
    return res.json({
      success: true,
      count: 0,
      data: [],
      meta: {
        reason:
          req.user.assigned
            ? 'You are already assigned to an active ride'
            : 'Set your availability to "available" to receive requests',
      },
    })
  }

  const bookings = await Booking.find({
    status: 'pending',
    driverId: null,
    rejectedBy: { $ne: req.user._id },
  })
    .sort({ createdAt: 1 })
    .limit(20)

  const data = await Promise.all(
    bookings.map(async (booking) => {
      const medicalInfo = await responderMedicalInfo(booking.patientId)
      return booking.toDriverView(req.user.currentLocation, medicalInfo)
    }),
  )

  res.json({ success: true, count: data.length, data })
})

/** GET /api/bookings/:id */
export const getBooking = asyncHandler(async (req, res) => {
  const booking = await findBookingOr404(req.params.id)
  const { isDriver } = assertCanView(req.user, booking)

  if (isDriver) {
    const medicalInfo = await responderMedicalInfo(booking.patientId)
    return res.json({
      success: true,
      data: booking.toDriverView(req.user.currentLocation, medicalInfo),
    })
  }

  res.json({ success: true, data: booking.toPatientView() })
})

/**
 * GET /api/bookings/:id/track
 * The patient polls this every ~10 s while the ambulance is on its way. It is
 * intentionally small: just what the live map and the ETA bubble need.
 */
export const trackBooking = asyncHandler(async (req, res) => {
  const booking = await findBookingOr404(req.params.id)
  assertCanView(req.user, booking)

  const fixAge = booking.driverLocation?.updatedAt
    ? Math.round((Date.now() - new Date(booking.driverLocation.updatedAt).getTime()) / 1000)
    : null

  res.json({
    success: true,
    data: {
      id: String(booking._id),
      status: booking.status,
      eta: booking.eta,
      etaMinutes: booking.etaMinutes,
      distance: booking.distanceKm === null ? null : formatDistance(booking.distanceKm),
      distanceKm: booking.distanceKm,
      pickupLocation: {
        address: booking.pickupLocation?.address || '',
        lat: booking.pickupLocation?.lat,
        lng: booking.pickupLocation?.lng,
      },
      patientLocation: booking.patientLocation
        ? {
            lat: booking.patientLocation.lat,
            lng: booking.patientLocation.lng,
            updatedAt: booking.patientLocation.updatedAt,
          }
        : null,
      driverLocation: booking.driverLocation
        ? {
            lat: booking.driverLocation.lat,
            lng: booking.driverLocation.lng,
            heading: booking.driverLocation.heading ?? null,
            speed: booking.driverLocation.speed ?? null,
            updatedAt: booking.driverLocation.updatedAt,
          }
        : null,
      driverLocationAgeSeconds: fixAge,
      driverLocationStale:
        fixAge !== null && fixAge > env.driverLocationStaleSeconds,
      driver: booking.driverId
        ? {
            id: String(booking.driverId),
            name: booking.driverSnapshot?.name,
            vehicleId: booking.driverSnapshot?.vehicleId,
            phone: booking.driverSnapshot?.phone,
            avatar: booking.driverSnapshot?.avatar,
            rating: booking.driverSnapshot?.rating ?? 5,
          }
        : null,
      hospital: booking.hospitalName || null,
      timeline: (booking.timeline || []).map((entry) => ({
        status: entry.status,
        time: entry.time,
        description: entry.description,
      })),
      updatedAt: booking.updatedAt,
      /** Suggested client poll interval, so the cadence lives server-side. */
      pollAfterSeconds: 10,
    },
  })
})

/**
 * PATCH /api/bookings/:id/driver-location
 * Called repeatedly by the driver app while moving. Also mirrors the fix onto
 * the driver's own record so their next incoming feed has fresh distances.
 */
export const updateDriverLocation = asyncHandler(async (req, res) => {
  const booking = await findBookingOr404(req.params.id)

  if (!booking.driverId || String(booking.driverId) !== String(req.user._id)) {
    throw ApiError.forbidden('You are not the assigned driver for this booking')
  }
  if (!ACTIVE_STATUSES.includes(booking.status)) {
    throw ApiError.badRequest('This booking is no longer active')
  }

  const point = normalisePoint(req.body)
  if (!point) throw ApiError.badRequest('A valid { lat, lng } pair is required')

  const now = new Date()
  booking.driverLocation = {
    ...point,
    accuracy: Number(req.body.accuracy) || undefined,
    heading: Number.isFinite(Number(req.body.heading)) ? Number(req.body.heading) : undefined,
    speed: Number.isFinite(Number(req.body.speed)) ? Number(req.body.speed) : undefined,
    updatedAt: now,
  }
  booking.refreshEta()
  await booking.save()

  req.user.currentLocation = { ...point, updatedAt: now }
  await req.user.save()

  res.json({
    success: true,
    data: {
      id: String(booking._id),
      driverLocation: booking.driverLocation,
      eta: booking.eta,
      distance: booking.distanceKm === null ? null : formatDistance(booking.distanceKm),
      distanceKm: booking.distanceKm,
      status: booking.status,
    },
  })
})

/** PATCH /api/bookings/:id/patient-location */
export const updatePatientLocation = asyncHandler(async (req, res) => {
  const booking = await findBookingOr404(req.params.id)

  if (String(booking.patientId) !== String(req.user._id)) {
    throw ApiError.forbidden('You can only update your own location')
  }
  if (!ACTIVE_STATUSES.includes(booking.status)) {
    throw ApiError.badRequest('This booking is no longer active')
  }

  const point = normalisePoint(req.body)
  if (!point) throw ApiError.badRequest('A valid { lat, lng } pair is required')

  booking.patientLocation = {
    ...point,
    accuracy: Number(req.body.accuracy) || undefined,
    updatedAt: new Date(),
  }

  // Before a driver takes the job the pickup point tracks the patient; once
  // someone is en route the pickup address is frozen so it cannot move on them.
  if (booking.status === 'pending') {
    booking.pickupLocation.lat = point.lat
    booking.pickupLocation.lng = point.lng
    if (req.body.address) booking.pickupLocation.address = String(req.body.address).trim()
  }

  await booking.save()

  res.json({
    success: true,
    data: {
      id: String(booking._id),
      patientLocation: booking.patientLocation,
      pickupLocation: booking.pickupLocation,
    },
  })
})

/**
 * POST /api/bookings/:id/accept
 * First driver to accept wins — the conditional update makes that atomic, so a
 * second acceptance gets a clean 409 instead of stealing the ride.
 */
export const acceptBooking = asyncHandler(async (req, res) => {
  if (req.user.role !== 'driver') {
    throw ApiError.forbidden('Only drivers can accept a request')
  }
  if (req.user.assigned) {
    throw ApiError.conflict('Finish your current ride before accepting another')
  }

  const now = new Date()
  const driverLocation = normalisePoint(req.body) || req.user.currentLocation

  const booking = await Booking.findOneAndUpdate(
    { _id: req.params.id, status: 'pending', driverId: null },
    {
      $set: {
        driverId: req.user._id,
        driverSnapshot: {
          name: req.user.name,
          vehicleId: req.user.vehicleId,
          phone: req.user.phone,
          avatar: req.user.avatar,
          rating: req.user.stats?.rating ?? 5,
        },
        status: 'matched',
        matchedAt: now,
        ...(driverLocation
          ? { driverLocation: { ...driverLocation, updatedAt: now } }
          : {}),
      },
      $push: {
        timeline: {
          status: 'Matched',
          time: now,
          description: `Ambulance ${req.user.vehicleId || ''} assigned`.trim(),
        },
      },
    },
    { new: true },
  )

  if (!booking) {
    throw ApiError.conflict('This request has already been taken or cancelled')
  }

  booking.refreshEta()
  await booking.save()

  req.user.assigned = true
  req.user.availability = 'busy'
  req.user.stats.acceptedCount = (req.user.stats.acceptedCount || 0) + 1
  if (driverLocation) req.user.currentLocation = { ...driverLocation, updatedAt: now }
  await req.user.save()

  const medicalInfo = await responderMedicalInfo(booking.patientId)
  res.json({
    success: true,
    data: booking.toDriverView(req.user.currentLocation, medicalInfo),
  })
})

/** POST /api/bookings/:id/reject — the request stays open for other drivers. */
export const rejectBooking = asyncHandler(async (req, res) => {
  if (req.user.role !== 'driver') {
    throw ApiError.forbidden('Only drivers can decline a request')
  }

  const booking = await findBookingOr404(req.params.id)
  if (booking.status !== 'pending') {
    throw ApiError.badRequest('This request is no longer open')
  }

  if (!booking.rejectedBy.some((id) => String(id) === String(req.user._id))) {
    booking.rejectedBy.push(req.user._id)
    await booking.save()
  }

  res.json({
    success: true,
    message: 'Request declined — it remains open to other drivers',
    data: { id: String(booking._id) },
  })
})

/**
 * PATCH /api/bookings/:id/status
 * Body: { status: 'en-route' | 'arrived' | 'completed' }
 */
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await findBookingOr404(req.params.id)
  const next = req.body.status

  if (!booking.driverId || String(booking.driverId) !== String(req.user._id)) {
    throw ApiError.forbidden('Only the assigned driver can advance this booking')
  }
  if (!NEXT_STATUS[booking.status]?.includes(next)) {
    throw ApiError.badRequest(
      `Cannot move a "${booking.status}" booking to "${next}". Allowed: ${
        NEXT_STATUS[booking.status]?.join(', ') || 'none'
      }`,
    )
  }

  booking.status = next
  booking.pushTimeline(next, req.body.description || STATUS_DESCRIPTIONS[next])

  if (next === 'completed') {
    booking.completedAt = new Date()
    booking.eta = null
    booking.etaMinutes = 0
  }
  if (next === 'arrived') {
    booking.eta = null
    booking.etaMinutes = 0
  }
  booking.refreshEta()
  await booking.save()

  if (next === 'completed') {
    await releaseDriver(req.user, { countTrip: true })
    await Activity.record({
      scope: 'patient',
      userId: booking.patientId,
      type: 'request',
      icon: 'ambulance',
      message: `Ambulance request completed — ${booking.hospitalName || 'hospital'}`,
    })
  }

  const medicalInfo = await responderMedicalInfo(booking.patientId)
  res.json({
    success: true,
    data: booking.toDriverView(req.user.currentLocation, medicalInfo),
  })
})

/**
 * POST /api/bookings/:id/cancel
 * A patient cancels outright. A driver "cancels" their assignment instead: the
 * request drops back to pending so another free driver can pick it up.
 */
export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await findBookingOr404(req.params.id)
  const { isPatient, isDriver } = assertCanView(req.user, booking)

  if (!ACTIVE_STATUSES.includes(booking.status)) {
    throw ApiError.badRequest('This booking is already closed')
  }

  if (isDriver && !isPatient) {
    const driver = await User.findById(booking.driverId)

    booking.driverId = null
    booking.driverSnapshot = undefined
    booking.driverLocation = undefined
    booking.status = 'pending'
    booking.eta = null
    booking.etaMinutes = null
    booking.distanceKm = null
    booking.matchedAt = undefined
    if (!booking.rejectedBy.some((id) => String(id) === String(req.user._id))) {
      booking.rejectedBy.push(req.user._id)
    }
    booking.pushTimeline('pending', 'Reassigning — previous driver became unavailable')
    await booking.save()

    if (driver) await releaseDriver(driver, { countTrip: false })

    return res.json({
      success: true,
      message: 'Assignment released — the request is open to other drivers again',
      data: booking.toPatientView(),
    })
  }

  booking.status = 'cancelled'
  booking.cancelledAt = new Date()
  booking.cancelReason = req.body.reason || 'Cancelled by patient'
  booking.eta = null
  booking.etaMinutes = null
  booking.pushTimeline('cancelled', booking.cancelReason)
  await booking.save()

  if (booking.driverId) {
    const driver = await User.findById(booking.driverId)
    if (driver) await releaseDriver(driver, { countTrip: false })
  }

  res.json({ success: true, data: booking.toPatientView() })
})

/** GET /api/bookings/stats/me — the four tiles on the patient dashboard. */
export const getMyBookingStats = asyncHandler(async (req, res) => {
  const filter =
    req.user.role === 'driver' ? { driverId: req.user._id } : { patientId: req.user._id }

  const bookings = await Booking.find(filter).select(
    'status createdAt matchedAt completedAt',
  )

  const completed = bookings.filter((b) => b.status === 'completed')
  const responseTimes = bookings
    .filter((b) => b.matchedAt)
    .map((b) => (new Date(b.matchedAt) - new Date(b.createdAt)) / 60000)

  const avgResponse = responseTimes.length
    ? responseTimes.reduce((sum, m) => sum + m, 0) / responseTimes.length
    : null

  res.json({
    success: true,
    data: {
      total: bookings.length,
      completed: completed.length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
      active: bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length,
      avgResponseMinutes: avgResponse === null ? null : Number(avgResponse.toFixed(1)),
      avgResponseLabel: avgResponse === null ? '—' : `${avgResponse.toFixed(1)} min`,
    },
  })
})

/* ---------------------------------------------------------------- helpers */

/** Frees a driver so the dispatch fan-out reaches them again. */
async function releaseDriver(driver, { countTrip }) {
  driver.assigned = false
  driver.availability = 'available'
  if (countTrip) {
    driver.stats.totalTrips = (driver.stats.totalTrips || 0) + 1
    driver.stats.tripsToday = (driver.stats.tripsToday || 0) + 1
    driver.stats.tripsThisWeek = (driver.stats.tripsThisWeek || 0) + 1
  }
  await driver.save()
}

/** The blood group / allergies / conditions strip a responder sees. */
async function responderMedicalInfo(patientId) {
  const profile = await MedicalProfile.findOne({ patientId })
  return profile ? profile.toResponderSnapshot() : null
}

export { formatEta }
