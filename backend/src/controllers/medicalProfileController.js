import MedicalProfile from '../models/MedicalProfile.js'
import Booking, { ACTIVE_STATUSES } from '../models/Booking.js'
import Activity from '../models/Activity.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import pick from '../utils/pick.js'

const PROFILE_FIELDS = [
  'bloodGroup',
  'height',
  'weight',
  'allergies',
  'conditions',
  'medications',
  'emergencyContacts',
]

/** Drops client-generated ids so Mongo assigns real ones to new sub-documents. */
function sanitiseSubdocs(list, fields) {
  if (!Array.isArray(list)) return undefined
  return list.map((item) => {
    const clean = pick(item, fields)
    if (/^[0-9a-fA-F]{24}$/.test(item?.id || '')) clean._id = item.id
    return clean
  })
}

/** GET /api/medical-profile/me */
export const getMyProfile = asyncHandler(async (req, res) => {
  if (req.user.role !== 'patient') {
    throw ApiError.forbidden('Only patients have a medical profile')
  }

  let profile = await MedicalProfile.findOne({ patientId: req.user._id })
  if (!profile) profile = await MedicalProfile.create({ patientId: req.user._id })

  res.json({ success: true, data: profile.toJSON() })
})

/** PUT /api/medical-profile/me — full replace of the editable sections. */
export const updateMyProfile = asyncHandler(async (req, res) => {
  if (req.user.role !== 'patient') {
    throw ApiError.forbidden('Only patients have a medical profile')
  }

  const updates = pick(req.body, PROFILE_FIELDS)

  if (updates.medications) {
    updates.medications = sanitiseSubdocs(updates.medications, [
      'name',
      'dosage',
      'frequency',
    ])
  }
  if (updates.emergencyContacts) {
    updates.emergencyContacts = sanitiseSubdocs(updates.emergencyContacts, [
      'name',
      'relationship',
      'phone',
    ])
  }
  for (const field of ['allergies', 'conditions']) {
    if (updates[field]) {
      updates[field] = updates[field].map((v) => String(v).trim()).filter(Boolean)
    }
  }

  const profile = await MedicalProfile.findOneAndUpdate(
    { patientId: req.user._id },
    { $set: updates },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  )

  await Activity.record({
    scope: 'patient',
    userId: req.user._id,
    type: 'profile',
    icon: 'profile',
    message: 'Medical profile updated',
  })

  res.json({ success: true, data: profile.toJSON() })
})

/**
 * GET /api/medical-profile/:patientId
 * Responder access. A driver may read a patient's profile only while they are
 * the assigned driver on that patient's live booking; hospital staff may read
 * it when the booking is headed to their hospital.
 */
export const getPatientProfile = asyncHandler(async (req, res) => {
  const { patientId } = req.params

  if (String(req.user._id) !== String(patientId)) {
    const filter = {
      patientId,
      status: { $in: ACTIVE_STATUSES },
    }
    if (req.user.role === 'driver') filter.driverId = req.user._id
    else if (req.user.role === 'hospital') filter.hospitalId = req.user.hospitalId
    else throw ApiError.forbidden('You cannot view this medical profile')

    const linked = await Booking.exists(filter)
    if (!linked) {
      throw ApiError.forbidden(
        'Medical profiles are only visible while you are attached to that patient\'s active request',
      )
    }
  }

  const profile = await MedicalProfile.findOne({ patientId })
  if (!profile) throw ApiError.notFound('No medical profile on record for this patient')

  // Responders get the emergency-relevant subset, patients get everything.
  const isSelf = String(req.user._id) === String(patientId)
  res.json({
    success: true,
    data: isSelf
      ? profile.toJSON()
      : {
          patientId: String(patientId),
          ...profile.toResponderSnapshot(),
          medications: profile.medications,
          emergencyContacts: profile.emergencyContacts,
        },
  })
})

/** GET /api/medical-profile/me/completeness — powers the dashboard nudge. */
export const getCompleteness = asyncHandler(async (req, res) => {
  const profile = await MedicalProfile.findOne({ patientId: req.user._id })

  const fields = [
    { label: 'Blood Group', done: Boolean(profile?.bloodGroup) },
    { label: 'Allergies', done: Boolean(profile?.allergies?.length) },
    { label: 'Emergency Contact', done: Boolean(profile?.emergencyContacts?.length) },
    { label: 'Medications', done: Boolean(profile?.medications?.length) },
    { label: 'Phone Number', done: Boolean(req.user.phone) },
  ]
  const done = fields.filter((f) => f.done).length

  res.json({
    success: true,
    data: { fields, completed: done, total: fields.length, percent: Math.round((done / fields.length) * 100) },
  })
})
