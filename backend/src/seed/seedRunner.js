/**
 * Seeding logic, shared by the `npm run seed` CLI and the in-memory dev server.
 * The fixtures are the same ones the frontend was originally mocked against, so
 * a freshly seeded database renders exactly what the mock-driven UI used to.
 */
import User from '../models/User.js'
import Hospital from '../models/Hospital.js'
import Doctor from '../models/Doctor.js'
import Staff from '../models/Staff.js'
import MedicalProfile from '../models/MedicalProfile.js'
import Booking, { TIMELINE_LABELS } from '../models/Booking.js'
import Activity from '../models/Activity.js'
import * as fixtures from './seedData.js'


const minutesAgo = (mins) => new Date(Date.now() - mins * 60_000)
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60_000)

async function wipe() {
  await Promise.all([
    User.deleteMany({}),
    Hospital.deleteMany({}),
    Doctor.deleteMany({}),
    Staff.deleteMany({}),
    MedicalProfile.deleteMany({}),
    Booking.deleteMany({}),
    Activity.deleteMany({}),
  ])
  console.log('[seed] collections cleared')
}

async function seedHospitals() {
  const byKey = new Map()
  for (const { key, ...data } of fixtures.hospitals) {
    const hospital = await Hospital.create({ ...data, lastUpdated: minutesAgo(18) })
    byKey.set(key, hospital)
  }
  console.log(`[seed] ${byKey.size} hospitals`)
  return byKey
}

async function seedUsers(hospitalsByKey) {
  const byKey = new Map()
  for (const { key, password, hospitalKey, ...data } of fixtures.users) {
    const user = new User({
      ...data,
      hospitalId: hospitalKey ? hospitalsByKey.get(hospitalKey)?._id : undefined,
      currentLocation: data.currentLocation
        ? { ...data.currentLocation, updatedAt: new Date() }
        : undefined,
    })
    await user.setPassword(password)
    await user.save()
    byKey.set(key, user)
  }
  console.log(`[seed] ${byKey.size} users`)
  return byKey
}

async function seedDoctorsAndStaff(hospitalsByKey, usersByKey) {
  const doctorDocs = fixtures.doctors.map(({ hospitalKey, ...d }) => ({
    ...d,
    hospitalId: hospitalsByKey.get(hospitalKey)._id,
  }))
  await Doctor.insertMany(doctorDocs)

  const staffDocs = fixtures.staff.map(({ hospitalKey, ...s }) => ({
    ...s,
    hospitalId: hospitalsByKey.get(hospitalKey)._id,
    // Link the demo administrator to their login account.
    userId: s.email === 'mchen@bostongeneral.org' ? usersByKey.get('u2')?._id : undefined,
  }))
  await Staff.insertMany(staffDocs)

  console.log(`[seed] ${doctorDocs.length} doctors, ${staffDocs.length} staff`)
}

async function seedMedicalProfile(usersByKey) {
  const { patientKey, ...data } = fixtures.medicalProfile
  await MedicalProfile.create({ ...data, patientId: usersByKey.get(patientKey)._id })
  console.log('[seed] 1 medical profile')
}

async function seedBookings(usersByKey, hospitalsByKey) {
  for (const fixture of fixtures.bookings) {
    const patient = usersByKey.get(fixture.patientKey)
    const driver = usersByKey.get(fixture.driverKey)
    const hospital = hospitalsByKey.get(fixture.hospitalKey)

    const createdAt = daysAgo(fixture.daysAgo)
    const matchedAt = new Date(createdAt.getTime() + 2.5 * 60_000)
    const enRouteAt = new Date(createdAt.getTime() + 4 * 60_000)
    const arrivedAt = new Date(createdAt.getTime() + 22 * 60_000)
    const completedAt = new Date(createdAt.getTime() + fixture.durationMinutes * 60_000)

    await Booking.create({
      patientId: patient._id,
      patientSnapshot: { name: patient.name, phone: patient.phone, avatar: patient.avatar },
      driverId: driver._id,
      driverSnapshot: {
        name: driver.name,
        vehicleId: driver.vehicleId,
        phone: driver.phone,
        avatar: driver.avatar,
        rating: driver.stats?.rating ?? 5,
      },
      hospitalId: hospital._id,
      hospitalName: hospital.name,
      status: fixture.status,
      pickupLocation: fixture.pickupLocation,
      emergencyType: fixture.emergencyType,
      emergencyNote: fixture.emergencyNote,
      eta: null,
      etaMinutes: 0,
      matchedAt,
      completedAt,
      createdAt,
      updatedAt: completedAt,
      timeline: [
        { status: TIMELINE_LABELS.pending, time: createdAt, description: 'Request submitted' },
        {
          status: TIMELINE_LABELS.matched,
          time: matchedAt,
          description: `Ambulance ${driver.vehicleId} assigned`,
        },
        {
          status: TIMELINE_LABELS['en-route'],
          time: enRouteAt,
          description: 'Driver en route to your location',
        },
        {
          status: TIMELINE_LABELS.arrived,
          time: arrivedAt,
          description: 'Ambulance arrived at pickup location',
        },
        {
          status: TIMELINE_LABELS.completed,
          time: completedAt,
          description: 'Patient transported safely to hospital',
        },
      ],
    })

    await Activity.create({
      scope: 'patient',
      userId: patient._id,
      type: 'request',
      icon: 'ambulance',
      message: `Ambulance request completed — ${hospital.name}`,
      createdAt: completedAt,
    })
  }
  console.log(`[seed] ${fixtures.bookings.length} historical bookings`)
}

async function seedActivity(usersByKey, hospitalsByKey) {
  const patient = usersByKey.get('u1')
  const hospital = hospitalsByKey.get('h1')

  await Activity.insertMany([
    {
      scope: 'patient',
      userId: patient._id,
      type: 'profile',
      icon: 'profile',
      message: 'Medical profile updated — Added new medication',
      createdAt: daysAgo(5),
    },
    {
      scope: 'patient',
      userId: patient._id,
      type: 'hospital',
      icon: 'hospital',
      message: 'Viewed Cambridge Medical Institute',
      createdAt: daysAgo(7),
    },
    {
      scope: 'hospital',
      hospitalId: hospital._id,
      type: 'bed',
      message: 'ICU beds updated — 3 new beds available',
      createdAt: minutesAgo(10),
    },
    {
      scope: 'hospital',
      hospitalId: hospital._id,
      type: 'staff',
      message: 'New staff member onboarded — Jennifer Walsh RN',
      createdAt: minutesAgo(120),
    },
    {
      scope: 'hospital',
      hospitalId: hospital._id,
      type: 'doctor',
      message: 'Dr. Foster schedule updated for next week',
      createdAt: minutesAgo(180),
    },
    {
      scope: 'hospital',
      hospitalId: hospital._id,
      type: 'bed',
      message: 'Emergency beds updated — capacity increased',
      createdAt: daysAgo(1),
    },
  ])
  console.log('[seed] activity feeds')
}


/**
 * Seeds every collection. Returns `false` without touching anything if the
 * database already has users, unless `fresh` is set.
 */
export async function seedAll({ fresh = false } = {}) {
  if (fresh) {
    await wipe()
  } else if (await User.exists({})) {
    console.log('[seed] database already has users — nothing to do.')
    return false
  }

  const hospitalsByKey = await seedHospitals()
  const usersByKey = await seedUsers(hospitalsByKey)
  await seedDoctorsAndStaff(hospitalsByKey, usersByKey)
  await seedMedicalProfile(usersByKey)
  await seedBookings(usersByKey, hospitalsByKey)
  await seedActivity(usersByKey, hospitalsByKey)
  return true
}

export { wipe }
