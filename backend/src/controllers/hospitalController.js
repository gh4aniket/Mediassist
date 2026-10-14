import Hospital from '../models/Hospital.js'
import Doctor from '../models/Doctor.js'
import Staff from '../models/Staff.js'
import Activity from '../models/Activity.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import pick from '../utils/pick.js'
import { distanceKm, formatDistance, normalisePoint } from '../utils/geo.js'
import { minutesSince } from '../utils/time.js'

const PROFILE_FIELDS = [
  'name',
  'address',
  'phone',
  'email',
  'website',
  'type',
  'description',
  'about',
  'services',
  'facilities',
  'images',
  'established',
]

const WARDS = ['icu', 'general', 'emergency']

/** Staff may only administer the hospital their account is attached to. */
function assertStaffOfHospital(user, hospitalId) {
  if (!user) throw ApiError.unauthorized()
  if (user.role !== 'hospital') {
    throw ApiError.forbidden('Only hospital staff can administer a hospital')
  }
  if (String(user.hospitalId || '') !== String(hospitalId)) {
    throw ApiError.forbidden('You can only manage your own hospital')
  }
}

async function findHospitalOr404(id) {
  const hospital = await Hospital.findById(id)
  if (!hospital) throw ApiError.notFound('Hospital not found')
  return hospital
}

/**
 * GET /api/hospitals
 * Query: q, type, sort=rating|icu|general|emergency|name|distance, lat, lng, limit
 * `lat`/`lng` are optional and only used for a haversine distance annotation —
 * there is no geospatial index query involved.
 */
export const listHospitals = asyncHandler(async (req, res) => {
  const { q, type, sort = 'rating', lat, lng, limit } = req.query

  const filter = {}
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: rx }, { address: rx }, { type: rx }]
  }
  if (type && type !== 'all') filter.type = type

  // Patients only see hospitals that opted into the public directory.
  if (!req.user || req.user.role !== 'hospital') {
    filter['settings.publicListing'] = { $ne: false }
  }

  let hospitals = await Hospital.find(filter)

  const viewer = normalisePoint({ lat, lng })
  let payload = hospitals.map((hospital) => {
    const json = hospital.toJSON()
    if (viewer && hospital.coordinates) {
      const km = distanceKm(viewer, hospital.coordinates)
      json.distanceKm = km === null ? null : Number(km.toFixed(2))
      json.distance = formatDistance(km)
    }
    return json
  })

  const sorters = {
    rating: (a, b) => (b.rating || 0) - (a.rating || 0),
    name: (a, b) => a.name.localeCompare(b.name),
    icu: (a, b) => (b.beds?.icu?.available || 0) - (a.beds?.icu?.available || 0),
    general: (a, b) => (b.beds?.general?.available || 0) - (a.beds?.general?.available || 0),
    emergency: (a, b) =>
      (b.beds?.emergency?.available || 0) - (a.beds?.emergency?.available || 0),
    distance: (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
  }
  payload.sort(sorters[sort] || sorters.rating)

  const max = Number(limit)
  if (Number.isFinite(max) && max > 0) payload = payload.slice(0, max)

  res.json({ success: true, count: payload.length, data: payload })
})

/** GET /api/hospitals/:id — hospital plus its doctors, ready for the detail page. */
export const getHospital = asyncHandler(async (req, res) => {
  const hospital = await findHospitalOr404(req.params.id)
  const showDoctors = hospital.settings?.showDoctors !== false
  const doctors = showDoctors ? await Doctor.find({ hospitalId: hospital._id }) : []

  res.json({
    success: true,
    data: { ...hospital.toJSON(), doctors: doctors.map((d) => d.toJSON()) },
  })
})

/** POST /api/hospitals — for staff who registered before a hospital existed. */
export const createHospital = asyncHandler(async (req, res) => {
  if (req.user.role !== 'hospital') {
    throw ApiError.forbidden('Only hospital staff can create a hospital')
  }

  const hospital = await Hospital.create({
    ...pick(req.body, PROFILE_FIELDS),
    coordinates: normalisePoint(req.body.coordinates) || undefined,
  })

  // First hospital wins: link the creator if they have no hospital yet.
  if (!req.user.hospitalId) {
    req.user.hospitalId = hospital._id
    await req.user.save()
  }

  res.status(201).json({ success: true, data: hospital.toJSON() })
})

/** PATCH /api/hospitals/:id */
export const updateHospital = asyncHandler(async (req, res) => {
  const hospital = await findHospitalOr404(req.params.id)
  assertStaffOfHospital(req.user, hospital._id)

  Object.assign(hospital, pick(req.body, PROFILE_FIELDS))

  const coordinates = normalisePoint(req.body.coordinates)
  if (coordinates) hospital.coordinates = coordinates

  await hospital.save()

  await Activity.record({
    scope: 'hospital',
    hospitalId: hospital._id,
    type: 'profile',
    message: 'Hospital profile details updated',
  })

  res.json({ success: true, data: hospital.toJSON() })
})

/**
 * PATCH /api/hospitals/:id/beds
 * Body: { icu: { total, available }, general: {...}, emergency: {...} }
 * Bumps `lastUpdated`, which every dashboard shows as "updated Nm ago".
 */
export const updateBeds = asyncHandler(async (req, res) => {
  const hospital = await findHospitalOr404(req.params.id)
  assertStaffOfHospital(req.user, hospital._id)

  const incoming = req.body?.beds || req.body || {}
  const errors = {}
  const next = {}

  for (const ward of WARDS) {
    if (incoming[ward] === undefined) continue

    const total = Number(incoming[ward].total ?? hospital.beds?.[ward]?.total ?? 0)
    const available = Number(
      incoming[ward].available ?? hospital.beds?.[ward]?.available ?? 0,
    )

    if (!Number.isInteger(total) || total < 0) {
      errors[`${ward}_total`] = 'Total beds must be a whole number of at least 0'
    }
    if (!Number.isInteger(available) || available < 0) {
      errors[`${ward}_available`] = 'Available beds cannot be negative'
    } else if (available > total) {
      errors[`${ward}_available`] = 'Available beds cannot exceed total beds'
    }
    next[ward] = { total, available }
  }

  if (Object.keys(errors).length) {
    throw ApiError.badRequest('Bed counts are invalid', errors)
  }
  if (!Object.keys(next).length) {
    throw ApiError.badRequest('No bed counts supplied')
  }

  const changes = []
  for (const [ward, counts] of Object.entries(next)) {
    const before = hospital.beds?.[ward]?.available ?? 0
    hospital.beds[ward] = counts
    if (counts.available !== before) {
      const delta = counts.available - before
      changes.push(
        `${ward.toUpperCase()} beds updated — ${Math.abs(delta)} ${
          delta > 0 ? 'more' : 'fewer'
        } available`,
      )
    }
  }

  hospital.lastUpdated = new Date()
  await hospital.save()

  for (const message of changes) {
    await Activity.record({
      scope: 'hospital',
      hospitalId: hospital._id,
      type: 'bed',
      message,
    })
  }

  res.json({ success: true, data: hospital.toJSON() })
})

/**
 * PATCH /api/hospitals/:id/location
 * Accepts either `{ coordinates: { lat, lng } }` or a flat `{ lat, lng }` —
 * the hospital settings page sends the browser's live position straight through.
 */
export const updateLocation = asyncHandler(async (req, res) => {
  const hospital = await findHospitalOr404(req.params.id)
  assertStaffOfHospital(req.user, hospital._id)

  const coordinates = normalisePoint(req.body.coordinates || req.body)
  if (!coordinates) {
    throw ApiError.badRequest('A valid { lat, lng } pair is required')
  }

  hospital.coordinates = coordinates
  if (req.body.address) hospital.address = String(req.body.address).trim()
  await hospital.save()

  await Activity.record({
    scope: 'hospital',
    hospitalId: hospital._id,
    type: 'profile',
    message: 'Hospital map location updated',
  })

  res.json({
    success: true,
    data: {
      id: String(hospital._id),
      coordinates: hospital.coordinates,
      address: hospital.address,
    },
  })
})

/** GET /api/hospitals/:id/summary — everything the hospital dashboard needs. */
export const getSummary = asyncHandler(async (req, res) => {
  const hospital = await findHospitalOr404(req.params.id)

  const [activeStaff, totalStaff, doctorCount, updates] = await Promise.all([
    Staff.countDocuments({ hospitalId: hospital._id, status: 'active' }),
    Staff.countDocuments({ hospitalId: hospital._id }),
    Doctor.countDocuments({ hospitalId: hospital._id }),
    Activity.find({ scope: 'hospital', hospitalId: hospital._id })
      .sort({ createdAt: -1 })
      .limit(6),
  ])

  res.json({
    success: true,
    data: {
      hospital: hospital.toJSON(),
      stats: {
        totalBeds: hospital.totalBeds,
        availableBeds: hospital.availableBeds,
        occupancyRate: hospital.occupancyRate,
        activeStaff,
        totalStaff,
        doctorCount,
        lastUpdatedMinutesAgo: minutesSince(hospital.lastUpdated),
      },
      recentUpdates: updates.map((u) => u.toJSON()),
    },
  })
})

/** GET /api/hospitals/:id/updates */
export const listUpdates = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50)
  const updates = await Activity.find({
    scope: 'hospital',
    hospitalId: req.params.id,
  })
    .sort({ createdAt: -1 })
    .limit(limit)

  res.json({ success: true, data: updates.map((u) => u.toJSON()) })
})

/** GET /api/hospitals/:id/settings */
export const getSettings = asyncHandler(async (req, res) => {
  const hospital = await findHospitalOr404(req.params.id)
  assertStaffOfHospital(req.user, hospital._id)
  res.json({ success: true, data: hospital.settings || {} })
})

/** PUT /api/hospitals/:id/settings */
export const updateSettings = asyncHandler(async (req, res) => {
  const hospital = await findHospitalOr404(req.params.id)
  assertStaffOfHospital(req.user, hospital._id)

  const allowed = [
    'notifyLowBeds',
    'lowBedThreshold',
    'notifyNewRequests',
    'publicListing',
    'showBedCounts',
    'showDoctors',
    'autoUpdateInterval',
    'timezone',
    'language',
  ]

  hospital.settings = { ...(hospital.settings?.toObject?.() || hospital.settings), ...pick(req.body, allowed) }
  await hospital.save()

  res.json({ success: true, data: hospital.settings })
})

export { assertStaffOfHospital, findHospitalOr404 }
