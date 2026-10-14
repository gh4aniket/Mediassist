import { Router } from 'express'
import * as staffController from '../controllers/staffController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validateObjectId } from '../middleware/validate.js'

const router = Router()

router.use(requireAuth, requireRole('hospital'))

router.get('/:id', validateObjectId('id'), staffController.getStaff)
router.patch('/:id', validateObjectId('id'), staffController.updateStaff)
router.delete('/:id', validateObjectId('id'), staffController.deleteStaff)

export default router
