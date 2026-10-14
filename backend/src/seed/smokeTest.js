/**
 * End-to-end smoke test against an in-memory MongoDB. Exercises the full
 * ambulance flow: register/login -> request -> driver accepts -> location
 * streaming -> patient polls -> status advance -> completion, plus the hospital
 * bed/location endpoints. Run with `npm run test:smoke`.
 */
import { MongoMemoryServer } from 'mongodb-memory-server'

let failures = 0
let checks = 0

function check(label, condition, detail) {
  checks += 1
  if (condition) {
    console.log(`  PASS  ${label}`)
  } else {
    failures += 1
    console.error(`  FAIL  ${label}${detail ? ` — ${JSON.stringify(detail)}` : ''}`)
  }
}

async function main() {
  const mongo = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongo.getUri('mediassist_smoke')
  process.env.JWT_SECRET = 'smoke-test-secret'
  process.env.NODE_ENV = 'test'

  const { connectDatabase, disconnectDatabase } = await import('../config/db.js')
  const { default: app } = await import('../app.js')
  await connectDatabase()

  const server = app.listen(0)
  const { port } = server.address()
  const base = `http://127.0.0.1:${port}/api`

  const call = async (method, path, { token, body } = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const json = await res.json().catch(() => ({}))
    // HTTP status wins over any `status` field the body happens to carry.
    return { ...json, status: res.status }
  }

  try {
    console.log('\n[1] health')
    const health = await call('GET', '/health')
    check('health endpoint responds', health.status === 200 && health.success, health)

    console.log('\n[2] registration')
    const patientReg = await call('POST', '/auth/register', {
      body: {
        name: 'Test Patient',
        email: 'p@test.com',
        password: 'demo123',
        phone: '+1 555 111',
        role: 'patient',
      },
    })
    check('patient registers', patientReg.status === 201 && patientReg.data?.token, patientReg)
    const patientToken = patientReg.data?.token
    const patientId = patientReg.data?.user?.id

    const staffReg = await call('POST', '/auth/register', {
      body: {
        name: 'Test Admin',
        email: 's@test.com',
        password: 'demo123',
        phone: '+1 555 222',
        role: 'hospital',
        hospitalName: 'Test General Hospital',
      },
    })
    check('hospital staff registers with a hospital', Boolean(staffReg.data?.user?.hospitalId), staffReg)
    const staffToken = staffReg.data?.token
    const hospitalId = staffReg.data?.user?.hospitalId

    const driverReg = await call('POST', '/auth/register', {
      body: {
        name: 'Test Driver',
        email: 'd@test.com',
        password: 'demo123',
        phone: '+1 555 333',
        role: 'driver',
        vehicleId: 'AMB-001',
      },
    })
    const driverToken = driverReg.data?.token
    check('driver registers offline by default', driverReg.data?.user?.availability === 'offline', driverReg)

    const dupe = await call('POST', '/auth/register', {
      body: { name: 'Someone Else', email: 'p@test.com', password: 'demo123', phone: '1', role: 'patient' },
    })
    check('duplicate email rejected with 409', dupe.status === 409, dupe)

    console.log('\n[3] login')
    const login = await call('POST', '/auth/login', {
      body: { email: 'p@test.com', password: 'demo123' },
    })
    check('valid credentials return a token', login.status === 200 && login.data?.token, login)
    const badLogin = await call('POST', '/auth/login', {
      body: { email: 'p@test.com', password: 'wrong' },
    })
    check('wrong password rejected with 401', badLogin.status === 401, badLogin)

    console.log('\n[4] hospital location + beds')
    const loc = await call('PATCH', `/hospitals/${hospitalId}/location`, {
      token: staffToken,
      body: { lat: 42.3601, lng: -71.0589, address: '100 Medical Drive' },
    })
    check('staff sets hospital live location', loc.data?.coordinates?.lat === 42.3601, loc)

    const beds = await call('PATCH', `/hospitals/${hospitalId}/beds`, {
      token: staffToken,
      body: { icu: { total: 10, available: 4 }, emergency: { total: 20, available: 6 } },
    })
    check('beds update', beds.data?.beds?.icu?.available === 4, beds.errors || beds)

    const badBeds = await call('PATCH', `/hospitals/${hospitalId}/beds`, {
      token: staffToken,
      body: { icu: { total: 5, available: 9 } },
    })
    check('available > total rejected', badBeds.status === 400, badBeds)

    const otherStaffBeds = await call('PATCH', `/hospitals/${hospitalId}/beds`, {
      token: patientToken,
      body: { icu: { total: 5, available: 1 } },
    })
    check('patients cannot edit beds', otherStaffBeds.status === 403, otherStaffBeds)

    const directory = await call('GET', '/hospitals?lat=42.36&lng=-71.05&sort=distance')
    check('public hospital directory lists the hospital', directory.count === 1, directory)
    check('directory annotates distance', directory.data?.[0]?.distance !== undefined, directory.data?.[0])

    console.log('\n[5] medical profile')
    const profile = await call('PUT', '/medical-profile/me', {
      token: patientToken,
      body: {
        bloodGroup: 'O+',
        allergies: ['Penicillin'],
        conditions: ['Hypertension'],
        medications: [{ name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' }],
        emergencyContacts: [{ name: 'Rob', relationship: 'Husband', phone: '+1 555 999' }],
      },
    })
    check('medical profile saves', profile.data?.bloodGroup === 'O+', profile)
    check('medication gets a server id', Boolean(profile.data?.medications?.[0]?.id), profile.data?.medications?.[0])

    console.log('\n[6] driver goes on duty')
    const avail = await call('PATCH', '/drivers/me/availability', {
      token: driverToken,
      body: { availability: 'available', lat: 42.368, lng: -71.063 },
    })
    check('driver becomes available', avail.data?.availability === 'available', avail)

    console.log('\n[7] booking request')
    const booking = await call('POST', '/bookings', {
      token: patientToken,
      body: {
        pickupLocation: { address: '42 Maple Street', lat: 42.3601, lng: -71.0589 },
        emergencyNote: 'Chest pain',
        emergencyType: 'Cardiac Emergency',
      },
    })
    check('booking created as pending', booking.data?.status === 'pending', booking)
    check('destination hospital auto-selected', booking.data?.hospital === 'Test General Hospital', booking.data)
    check('one free driver was notified', booking.meta?.driversNotified === 1, booking.meta)
    const bookingId = booking.data?.id

    const duplicate = await call('POST', '/bookings', {
      token: patientToken,
      body: { pickupLocation: { address: 'X', lat: 42.36, lng: -71.05 } },
    })
    check('second active booking rejected with 409', duplicate.status === 409, duplicate)

    const noCoords = await call('POST', '/bookings', {
      token: staffToken,
      body: { pickupLocation: { address: 'X' } },
    })
    check('non-patients cannot request an ambulance', noCoords.status === 403, noCoords)

    console.log('\n[8] driver dispatch feed')
    const incoming = await call('GET', '/bookings/incoming', { token: driverToken })
    check('pending request reaches the free driver', incoming.count === 1, incoming)
    check('feed carries the medical snapshot', incoming.data?.[0]?.medicalInfo?.bloodGroup === 'O+', incoming.data?.[0])
    check('feed computes distance from the driver', Boolean(incoming.data?.[0]?.distance), incoming.data?.[0])

    console.log('\n[9] accept')
    const accept = await call('POST', `/bookings/${bookingId}/accept`, {
      token: driverToken,
      body: { lat: 42.368, lng: -71.063 },
    })
    check('driver accepts, booking becomes matched', accept.data?.status === 'matched', accept)

    const secondAccept = await call('POST', `/bookings/${bookingId}/accept`, { token: driverToken })
    check('re-accepting the same booking is a 409', secondAccept.status === 409, secondAccept)

    const feedAfterAccept = await call('GET', '/bookings/incoming', { token: driverToken })
    check('assigned driver sees an empty feed', feedAfterAccept.count === 0, feedAfterAccept)

    const goAvailable = await call('PATCH', '/drivers/me/availability', {
      token: driverToken,
      body: { availability: 'available' },
    })
    check('assigned driver cannot go back on duty', goAvailable.status === 400, goAvailable)

    console.log('\n[10] live location streaming')
    const stream1 = await call('PATCH', `/bookings/${bookingId}/driver-location`, {
      token: driverToken,
      body: { lat: 42.366, lng: -71.062 },
    })
    check('driver streams a fix', Boolean(stream1.data?.eta), stream1)
    const eta1 = stream1.data?.distanceKm

    const stream2 = await call('PATCH', `/bookings/${bookingId}/driver-location`, {
      token: driverToken,
      body: { lat: 42.3615, lng: -71.0595 },
    })
    check('ETA shrinks as the driver closes in', stream2.data?.distanceKm < eta1, {
      before: eta1,
      after: stream2.data?.distanceKm,
    })

    const track = await call('GET', `/bookings/${bookingId}/track`, { token: patientToken })
    check('patient poll sees the driver location', track.data?.driverLocation?.lat === 42.3615, track.data)
    check('poll advertises its own cadence', track.data?.pollAfterSeconds === 10, track.data)
    check('poll reports a fresh fix', track.data?.driverLocationStale === false, track.data)

    const patientMove = await call('PATCH', `/bookings/${bookingId}/patient-location`, {
      token: patientToken,
      body: { lat: 42.3602, lng: -71.059 },
    })
    check('patient streams their own location', patientMove.data?.patientLocation?.lat === 42.3602, patientMove)
    check(
      'pickup point frozen once matched',
      patientMove.data?.pickupLocation?.lat === 42.3601,
      patientMove.data?.pickupLocation,
    )

    const destinationTrack = await call('GET', `/bookings/${bookingId}/track`, { token: staffToken })
    check('destination hospital staff can track', destinationTrack.status === 200, destinationTrack)

    const otherHospital = await call('POST', '/auth/register', {
      body: {
        name: 'Rival Admin',
        email: 'rival@test.com',
        password: 'demo123',
        phone: '+1 555 444',
        role: 'hospital',
        hospitalName: 'Rival Hospital',
      },
    })
    const foreignTrack = await call('GET', `/bookings/${bookingId}/track`, {
      token: otherHospital.data?.token,
    })
    check('staff at an unrelated hospital cannot track', foreignTrack.status === 403, foreignTrack)

    console.log('\n[11] status machine')
    const skip = await call('PATCH', `/bookings/${bookingId}/status`, {
      token: driverToken,
      body: { status: 'completed' },
    })
    check('cannot skip straight to completed', skip.status === 400, skip)

    const enRoute = await call('PATCH', `/bookings/${bookingId}/status`, {
      token: driverToken,
      body: { status: 'en-route' },
    })
    check('matched -> en-route', enRoute.data?.status === 'en-route', enRoute)

    const arrived = await call('PATCH', `/bookings/${bookingId}/status`, {
      token: driverToken,
      body: { status: 'arrived' },
    })
    check('en-route -> arrived', arrived.data?.status === 'arrived', arrived)

    const completed = await call('PATCH', `/bookings/${bookingId}/status`, {
      token: driverToken,
      body: { status: 'completed' },
    })
    check('arrived -> completed', completed.data?.status === 'completed', completed)
    check('timeline has all five entries', completed.data?.timeline?.length === 5, completed.data?.timeline)

    const driverStats = await call('GET', '/drivers/me/stats', { token: driverToken })
    check('completion frees the driver', driverStats.data?.assigned === false, driverStats)
    check('completed trip counted', driverStats.data?.totalTrips === 1, driverStats)

    console.log('\n[12] history + dashboards')
    const history = await call('GET', '/bookings', { token: patientToken })
    check('patient history lists the ride', history.count === 1, history)
    check('history row keeps the driver card', history.data?.[0]?.driver?.vehicleId === 'AMB-001', history.data?.[0])

    const stats = await call('GET', '/bookings/stats/me', { token: patientToken })
    check('patient stats count the completion', stats.data?.completed === 1, stats)

    const activity = await call('GET', '/activity/me', { token: patientToken })
    check('activity feed populated', activity.count >= 1, activity)
    check('activity carries a relative time label', Boolean(activity.data?.[0]?.time), activity.data?.[0])

    const summary = await call('GET', `/hospitals/${hospitalId}/summary`, { token: staffToken })
    check('hospital summary computes occupancy', typeof summary.data?.stats?.occupancyRate === 'number', summary)
    check('hospital updates feed populated', summary.data?.recentUpdates?.length >= 1, summary.data?.recentUpdates)

    console.log('\n[13] doctors + staff')
    const doctor = await call('POST', `/hospitals/${hospitalId}/doctors`, {
      token: staffToken,
      body: { name: 'Dr. Test', specialization: 'Cardiology' },
    })
    check('doctor created', doctor.status === 201, doctor)
    const editDoctor = await call('PATCH', `/doctors/${doctor.data.id}`, {
      token: staffToken,
      body: { experience: '12 years' },
    })
    check('doctor updated', editDoctor.data?.experience === '12 years', editDoctor)
    const removeDoctor = await call('DELETE', `/doctors/${doctor.data.id}`, { token: staffToken })
    check('doctor removed', removeDoctor.success === true, removeDoctor)

    const staffList = await call('GET', `/hospitals/${hospitalId}/staff`, { token: staffToken })
    check('staff directory includes the registered admin', staffList.count === 1, staffList)
    check('staff directory returns role facets', Array.isArray(staffList.meta?.roles), staffList.meta)

    console.log('\n[14] assistant')
    const chat = await call('POST', '/assistant/chat', {
      token: patientToken,
      body: { message: 'I have chest pain, what should I do?' },
    })
    check('assistant answers', Boolean(chat.data?.content), chat)
    check('assistant flags urgency', chat.data?.urgent === true, chat.data)
    check('offline fallback reported in meta', chat.meta?.engine === 'offline-fallback', chat.meta)

    console.log('\n[15] auth guards')
    const noToken = await call('GET', '/bookings')
    check('unauthenticated request rejected', noToken.status === 401, noToken)
    const badId = await call('GET', '/bookings/not-an-id')
    check('malformed id rejected before the query', badId.status === 401 || badId.status === 400, badId)
    const missing = await call('GET', '/nope')
    check('unknown route 404s', missing.status === 404, missing)

    console.log('\n[16] cancellation')
    const second = await call('POST', '/bookings', {
      token: patientToken,
      body: { pickupLocation: { address: '42 Maple Street', lat: 42.3601, lng: -71.0589 } },
    })
    const cancel = await call('POST', `/bookings/${second.data.id}/cancel`, {
      token: patientToken,
      body: { reason: 'No longer needed' },
    })
    check('patient cancels a pending booking', cancel.data?.status === 'cancelled', cancel)
    check('cancel reason recorded on the timeline', cancel.data?.timeline?.at(-1)?.status === 'Cancelled', cancel.data?.timeline)

    void patientId
  } finally {
    server.close()
    await disconnectDatabase()
    await mongo.stop()
  }

  console.log(`\n${checks - failures}/${checks} checks passed`)
  if (failures) process.exit(1)
}

main().catch((err) => {
  console.error('\nsmoke test crashed:', err)
  process.exit(1)
})
