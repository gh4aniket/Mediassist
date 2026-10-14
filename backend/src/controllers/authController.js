import User from '../models/User.js'
import Hospital from '../models/Hospital.js'
import Staff from '../models/Staff.js'
import MedicalProfile from '../models/MedicalProfile.js'
import Activity from '../models/Activity.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import pick from '../utils/pick.js'
import { signToken } from '../utils/token.js'

const DEFAULT_AVATARS = {
  patient:
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&auto=format',
  hospital:
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=120&h=120&fit=crop&auto=format',
  driver:
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&auto=format',
}

/** Fields a user may change about themselves, per role. */
const EDITABLE_FIELDS = {
  patient: ['name', 'phone', 'avatar', 'address', 'dateOfBirth', 'gender'],
  hospital: ['name', 'phone', 'avatar', 'staffRole'],
  driver: [
    'name',
    'phone',
    'avatar',
    'vehicleId',
    'licenseNumber',
    'experience',
    'certifications',
  ],
}

function authPayload(user) {
  return { user: user.toJSON(), token: signToken(user) }
}

/**
 * POST /api/auth/register
 * Role-aware: hospital staff get (or create) a hospital and a staff record,
 * patients get an empty medical profile so the profile page has something to load.
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body
  const normalisedEmail = String(email).toLowerCase().trim()

  if (await User.exists({ email: normalisedEmail })) {
    throw ApiError.conflict('An account with this email already exists')
  }

  const user = new User({
    name: String(name).trim(),
    email: normalisedEmail,
    phone,
    role,
    avatar: req.body.avatar || DEFAULT_AVATARS[role],
  })
  await user.setPassword(password)

  if (role === 'hospital') {
    const hospitalName = String(req.body.hospitalName || '').trim()
    if (!hospitalName) throw ApiError.badRequest('Hospital name is required')

    let hospital = await Hospital.findOne({
      name: new RegExp(`^${hospitalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    })
    if (!hospital) {
      hospital = await Hospital.create({
        name: hospitalName,
        email: normalisedEmail,
        phone,
        verified: false,
      })
    }
    user.hospitalId = hospital._id
    user.staffRole = req.body.staffRole || 'Administrator'
  }

  if (role === 'driver') {
    const vehicleId = String(req.body.vehicleId || '').trim()
    if (!vehicleId) throw ApiError.badRequest('Vehicle / Ambulance ID is required')
    user.vehicleId = vehicleId
    user.licenseNumber = req.body.licenseNumber
    user.experience = req.body.experience
    user.certifications = req.body.certifications
    user.availability = 'offline'
    user.assigned = false
  }

  await user.save()

  if (role === 'patient') {
    await MedicalProfile.create({ patientId: user._id })
  }

  if (role === 'hospital') {
    await Staff.create({
      hospitalId: user.hospitalId,
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.staffRole,
      department: 'Administration',
      status: 'active',
      phone: user.phone,
      joinDate: new Date().toISOString().slice(0, 10),
      avatar: user.avatar,
    })
    await Activity.record({
      scope: 'hospital',
      hospitalId: user.hospitalId,
      type: 'staff',
      message: `New staff member onboarded — ${user.name}`,
    })
  }

  res.status(201).json({ success: true, data: authPayload(user) })
})

/** POST /api/auth/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select(
    '+passwordHash',
  )
  if (!user || !(await user.verifyPassword(password))) {
    throw ApiError.unauthorized('Invalid email or password')
  }

  // Drop the selected hash before the document is serialised back to the client.
  user.passwordHash = undefined
  res.json({ success: true, data: authPayload(user) })
})

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.toJSON() })
})

/** PATCH /api/auth/me */
export const updateMe = asyncHandler(async (req, res) => {
  const updates = pick(req.body, EDITABLE_FIELDS[req.user.role] || [])
  Object.assign(req.user, updates)
  await req.user.save()

  if (req.user.role === 'patient') {
    await Activity.record({
      scope: 'patient',
      userId: req.user._id,
      type: 'profile',
      message: 'Personal profile updated',
      icon: 'profile',
    })
  }

  res.json({ success: true, data: req.user.toJSON() })
})

/** PATCH /api/auth/me/password */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body

  const user = await User.findById(req.user._id).select('+passwordHash')
  if (!(await user.verifyPassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect')
  }

  await user.setPassword(newPassword)
  await user.save()

  res.json({ success: true, message: 'Password updated' })
})
