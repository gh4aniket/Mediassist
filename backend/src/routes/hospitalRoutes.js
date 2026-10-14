import { Router } from 'express'
import * as hospitalController from '../controllers/hospitalController.js'
import * as doctorController from '../controllers/doctorController.js'
import * as staffController from '../controllers/staffController.js'
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js'
import { validateBody, validateObjectId } from '../middleware/validate.js'

const router = Router()

// Public directory — patients browse hospitals without needing a session.
router.get('/', optionalAuth, hospitalController.listHospitals)

router.post(
  '/',
  requireAuth,
  requireRole('hospital'),
  validateBody({ name: { required: true, minLength: 2 } }),
  hospitalController.createHospital,
)

router.get('/:id', validateObjectId('id'), hospitalController.getHospital)
router.get('/:id/summary', validateObjectId('id'), requireAuth, hospitalController.getSummary)
router.get('/:id/updates', validateObjectId('id'), requireAuth, hospitalController.listUpdates)

router.patch(
  '/:id',
  validateObjectId('id'),
  requireAuth,
  requireRole('hospital'),
  hospitalController.updateHospital,
)

router.patch(
  '/:id/beds',
  validateObjectId('id'),
  requireAuth,
  requireRole('hospital'),
  hospitalController.updateBeds,
)

// Live-location setter: the settings page posts the browser's current position.
router.patch(
  '/:id/location',
  validateObjectId('id'),
  requireAuth,
  requireRole('hospital'),
  hospitalController.updateLocation,
)

router
  .route('/:id/settings')
  .get(validateObjectId('id'), requireAuth, requireRole('hospital'), hospitalController.getSettings)
  .put(validateObjectId('id'), requireAuth, requireRole('hospital'), hospitalController.updateSettings)

/* ------------------------------------------------------- nested resources */

router.get(
  '/:hospitalId/doctors',
  validateObjectId('hospitalId'),
  doctorController.listDoctors,
)

router.post(
  '/:hospitalId/doctors',
  validateObjectId('hospitalId'),
  requireAuth,
  requireRole('hospital'),
  validateBody({ name: { required: true, minLength: 2 } }),
  doctorController.createDoctor,
)

router.get(
  '/:hospitalId/staff',
  validateObjectId('hospitalId'),
  requireAuth,
  requireRole('hospital'),
  staffController.listStaff,
)

router.post(
  '/:hospitalId/staff',
  validateObjectId('hospitalId'),
  requireAuth,
  requireRole('hospital'),
  validateBody({
    name: { required: true, minLength: 2 },
    email: { required: true, type: 'email' },
  }),
  staffController.createStaff,
)

export default router
