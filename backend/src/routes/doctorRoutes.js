import { Router } from 'express'
import * as doctorController from '../controllers/doctorController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validateObjectId } from '../middleware/validate.js'

const router = Router()

router.get('/:id', validateObjectId('id'), doctorController.getDoctor)

router.patch(
  '/:id',
  validateObjectId('id'),
  requireAuth,
  requireRole('hospital'),
  doctorController.updateDoctor,
)

router.delete(
  '/:id',
  validateObjectId('id'),
  requireAuth,
  requireRole('hospital'),
  doctorController.deleteDoctor,
)

export default router
