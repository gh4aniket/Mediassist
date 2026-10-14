import User, { DRIVER_AVAILABILITY } from '../models/User.js'
import Booking, { ACTIVE_STATUSES } from '../models/Booking.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import { normalisePoint } from '../utils/geo.js'

/**
 * PATCH /api/drivers/me/availability
 * Body: { availability: 'available' | 'busy' | 'offline' }
 * Dispatch reads exactly these two flags — availability and `assigned` — to
 * decide who sees a new request, so a driver on a ride cannot go back on duty.
 */
export const updateAvailability = asyncHandler(async (req, res) => {
  const { availability } = req.body

  if (!DRIVER_AVAILABILITY.includes(availability)) {
    throw ApiError.badRequest(
      `availability must be one of: ${DRIVER_AVAILABILITY.join(', ')}`,
    )
  }
  if (req.user.assigned && availability === 'available') {
    throw ApiError.badRequest(
      'You are still assigned to an active ride — complete or release it first',
    )
  }

  req.user.availability = availability

  const point = normalisePoint(req.body.location || req.body)
  if (point) req.user.currentLocation = { ...point, updatedAt: new Date() }

  await req.user.save()

  res.json({
    success: true,
    data: {
      availability: req.user.availability,
      assigned: req.user.assigned,
      currentLocation: req.user.currentLocation || null,
    },
  })
})

/**
 * PATCH /api/drivers/me/location
 * The driver's own position, independent of any booking — this is what makes
 * distances in the incoming-request feed meaningful before they accept one.
 */
export const updateOwnLocation = asyncHandler(async (req, res) => {
  const point = normalisePoint(req.body.location || req.body)
  if (!point) throw ApiError.badRequest('A valid { lat, lng } pair is required')

  const now = new Date()
  req.user.currentLocation = {
    ...point,
    accuracy: Number(req.body.accuracy) || undefined,
    updatedAt: now,
  }
  await req.user.save()

  // Keep the active booking's stream in step, so the patient's poll sees this fix.
  const booking = await Booking.findOne({
    driverId: req.user._id,
    status: { $in: ACTIVE_STATUSES },
  })
  if (booking) {
    booking.driverLocation = { ...point, updatedAt: now }
    booking.refreshEta()
    await booking.save()
  }

  res.json({
    success: true,
    data: {
      currentLocation: req.user.currentLocation,
      activeBookingId: booking ? String(booking._id) : null,
      eta: booking?.eta || null,
    },
  })
})

/** GET /api/drivers/me/stats — the tiles on the driver home and profile pages. */
export const getMyStats = asyncHandler(async (req, res) => {
  const [totalTrips, completedToday, completedThisWeek] = await Promise.all([
    Booking.countDocuments({ driverId: req.user._id, status: 'completed' }),
    Booking.countDocuments({
      driverId: req.user._id,
      status: 'completed',
      completedAt: { $gte: startOfDay() },
    }),
    Booking.countDocuments({
      driverId: req.user._id,
      status: 'completed',
      completedAt: { $gte: startOfWeek() },
    }),
  ])

  res.json({
    success: true,
    data: {
      totalTrips,
      tripsToday: completedToday,
      tripsThisWeek: completedThisWeek,
      rating: req.user.stats?.rating ?? 5,
      acceptanceRate: req.user.acceptanceRate,
      availability: req.user.availability,
      assigned: req.user.assigned,
    },
  })
})

/** GET /api/drivers — hospital staff view of the fleet. */
export const listDrivers = asyncHandler(async (req, res) => {
  if (req.user.role !== 'hospital') {
    throw ApiError.forbidden('Only hospital staff can list drivers')
  }

  const filter = { role: 'driver' }
  if (req.query.availability) filter.availability = req.query.availability
  if (req.query.assigned !== undefined) filter.assigned = req.query.assigned === 'true'

  const drivers = await User.find(filter).sort({ name: 1 })
  res.json({ success: true, count: drivers.length, data: drivers.map((d) => d.toJSON()) })
})

function startOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek() {
  const d = startOfDay()
  d.setDate(d.getDate() - d.getDay())
  return d
}
