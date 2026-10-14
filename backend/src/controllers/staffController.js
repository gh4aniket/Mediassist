import Staff from '../models/Staff.js'
import Activity from '../models/Activity.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import pick from '../utils/pick.js'
import { assertStaffOfHospital, findHospitalOr404 } from './hospitalController.js'

const STAFF_FIELDS = [
  'name',
  'email',
  'role',
  'department',
  'status',
  'phone',
  'joinDate',
  'avatar',
]

/**
 * GET /api/hospitals/:hospitalId/staff
 * Query: q, role, status — the staff page filters server-side so large teams
 * do not have to be shipped down in full.
 */
export const listStaff = asyncHandler(async (req, res) => {
  const hospital = await findHospitalOr404(req.params.hospitalId)
  assertStaffOfHospital(req.user, hospital._id)

  const { q, role, status } = req.query
  const filter = { hospitalId: hospital._id }

  if (role && role !== 'all') filter.role = role
  if (status && status !== 'all') filter.status = status
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: rx }, { email: rx }, { department: rx }]
  }

  const [staff, allRoles] = await Promise.all([
    Staff.find(filter).sort({ name: 1 }),
    Staff.distinct('role', { hospitalId: hospital._id }),
  ])

  res.json({
    success: true,
    count: staff.length,
    data: staff.map((s) => s.toJSON()),
    meta: { roles: allRoles.sort() },
  })
})

/** GET /api/staff/:id */
export const getStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id)
  if (!staff) throw ApiError.notFound('Staff member not found')
  assertStaffOfHospital(req.user, staff.hospitalId)
  res.json({ success: true, data: staff.toJSON() })
})

/** POST /api/hospitals/:hospitalId/staff */
export const createStaff = asyncHandler(async (req, res) => {
  const hospital = await findHospitalOr404(req.params.hospitalId)
  assertStaffOfHospital(req.user, hospital._id)

  const staff = await Staff.create({
    hospitalId: hospital._id,
    joinDate: new Date().toISOString().slice(0, 10),
    ...pick(req.body, STAFF_FIELDS),
  })

  await Activity.record({
    scope: 'hospital',
    hospitalId: hospital._id,
    type: 'staff',
    message: `New staff member onboarded — ${staff.name}`,
  })

  res.status(201).json({ success: true, data: staff.toJSON() })
})

/** PATCH /api/staff/:id */
export const updateStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id)
  if (!staff) throw ApiError.notFound('Staff member not found')
  assertStaffOfHospital(req.user, staff.hospitalId)

  const before = staff.status
  Object.assign(staff, pick(req.body, STAFF_FIELDS))
  await staff.save()

  if (before !== staff.status) {
    await Activity.record({
      scope: 'hospital',
      hospitalId: staff.hospitalId,
      type: 'staff',
      message: `${staff.name} is now ${staff.status}`,
    })
  }

  res.json({ success: true, data: staff.toJSON() })
})

/** DELETE /api/staff/:id */
export const deleteStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id)
  if (!staff) throw ApiError.notFound('Staff member not found')
  assertStaffOfHospital(req.user, staff.hospitalId)

  await staff.deleteOne()

  await Activity.record({
    scope: 'hospital',
    hospitalId: staff.hospitalId,
    type: 'staff',
    message: `${staff.name} removed from the staff directory`,
  })

  res.json({ success: true, message: 'Staff member removed', data: { id: req.params.id } })
})
