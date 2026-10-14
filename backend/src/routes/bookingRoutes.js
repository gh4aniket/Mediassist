import { Router } from 'express'
import * as bookingController from '../controllers/bookingController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validateBody, validateObjectId } from '../middleware/validate.js'
import { BOOKING_STATUSES } from '../models/Booking.js'

const router = Router()

router.use(requireAuth)

/* Collection-level routes must come before "/:id" so they are not shadowed. */
router.get('/active', bookingController.getActiveBooking)
router.get('/incoming', requireRole('driver'), bookingController.listIncomingBookings)
router.get('/stats/me', bookingController.getMyBookingStats)

router
  .route('/')
  .get(bookingController.listBookings)
  .post(
    requireRole('patient'),
    validateBody({
      emergencyNote: { maxLength: 500 },
    }),
    bookingController.createBooking,
  )

router.get('/:id', validateObjectId('id'), bookingController.getBooking)

/** Polled by the patient roughly every 10 seconds while a ride is live. */
router.get('/:id/track', validateObjectId('id'), bookingController.trackBooking)

/** Pushed by the driver app as the ambulance moves. */
router.patch(
  '/:id/driver-location',
  validateObjectId('id'),
  requireRole('driver'),
  validateBody({
    lat: { required: true, type: 'number', min: -90, max: 90 },
    lng: { required: true, type: 'number', min: -180, max: 180 },
  }),
  bookingController.updateDriverLocation,
)

router.patch(
  '/:id/patient-location',
  validateObjectId('id'),
  requireRole('patient'),
  validateBody({
    lat: { required: true, type: 'number', min: -90, max: 90 },
    lng: { required: true, type: 'number', min: -180, max: 180 },
  }),
  bookingController.updatePatientLocation,
)

router.post(
  '/:id/accept',
  validateObjectId('id'),
  requireRole('driver'),
  bookingController.acceptBooking,
)

router.post(
  '/:id/reject',
  validateObjectId('id'),
  requireRole('driver'),
  bookingController.rejectBooking,
)

router.patch(
  '/:id/status',
  validateObjectId('id'),
  requireRole('driver'),
  validateBody({
    status: { required: true, enum: BOOKING_STATUSES },
  }),
  bookingController.updateBookingStatus,
)

router.post('/:id/cancel', validateObjectId('id'), bookingController.cancelBooking)

export default router
