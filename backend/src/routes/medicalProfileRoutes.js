import { Router } from 'express'
import * as medicalProfileController from '../controllers/medicalProfileController.js'
import { requireAuth } from '../middleware/auth.js'
import { validateObjectId } from '../middleware/validate.js'

const router = Router()

router.use(requireAuth)

router.get('/me', medicalProfileController.getMyProfile)
router.put('/me', medicalProfileController.updateMyProfile)
router.get('/me/completeness', medicalProfileController.getCompleteness)

router.get('/:patientId', validateObjectId('patientId'), medicalProfileController.getPatientProfile)

export default router
