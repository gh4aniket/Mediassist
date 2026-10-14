import Doctor from '../models/Doctor.js'
import Activity from '../models/Activity.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import pick from '../utils/pick.js'
import { assertStaffOfHospital, findHospitalOr404 } from './hospitalController.js'

const DOCTOR_FIELDS = [
  'name',
  'specialization',
  'qualifications',
  'experience',
  'description',
  'image',
  'email',
  'phone',
  'availability',
]

/** GET /api/hospitals/:hospitalId/doctors */
export const listDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find({ hospitalId: req.params.hospitalId }).sort({
    createdAt: 1,
  })
  res.json({ success: true, count: doctors.length, data: doctors.map((d) => d.toJSON()) })
})

/** GET /api/doctors/:id */
export const getDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id)
  if (!doctor) throw ApiError.notFound('Doctor not found')
  res.json({ success: true, data: doctor.toJSON() })
})

/** POST /api/hospitals/:hospitalId/doctors */
export const createDoctor = asyncHandler(async (req, res) => {
  const hospital = await findHospitalOr404(req.params.hospitalId)
  assertStaffOfHospital(req.user, hospital._id)

  const doctor = await Doctor.create({
    hospitalId: hospital._id,
    ...pick(req.body, DOCTOR_FIELDS),
  })

  await Activity.record({
    scope: 'hospital',
    hospitalId: hospital._id,
    type: 'doctor',
    message: `${doctor.name} added to the doctors directory`,
  })

  res.status(201).json({ success: true, data: doctor.toJSON() })
})

/** PATCH /api/doctors/:id */
export const updateDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id)
  if (!doctor) throw ApiError.notFound('Doctor not found')
  assertStaffOfHospital(req.user, doctor.hospitalId)

  Object.assign(doctor, pick(req.body, DOCTOR_FIELDS))
  await doctor.save()

  await Activity.record({
    scope: 'hospital',
    hospitalId: doctor.hospitalId,
    type: 'doctor',
    message: `${doctor.name} profile updated`,
  })

  res.json({ success: true, data: doctor.toJSON() })
})

/** DELETE /api/doctors/:id */
export const deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id)
  if (!doctor) throw ApiError.notFound('Doctor not found')
  assertStaffOfHospital(req.user, doctor.hospitalId)

  await doctor.deleteOne()

  await Activity.record({
    scope: 'hospital',
    hospitalId: doctor.hospitalId,
    type: 'doctor',
    message: `${doctor.name} removed from the doctors directory`,
  })

  res.json({ success: true, message: 'Doctor removed', data: { id: req.params.id } })
})
