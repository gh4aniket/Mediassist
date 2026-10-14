import { Router } from 'express'
import * as driverController from '../controllers/driverController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

router.get('/', requireRole('hospital'), driverController.listDrivers)

router.patch('/me/availability', requireRole('driver'), driverController.updateAvailability)
router.patch('/me/location', requireRole('driver'), driverController.updateOwnLocation)
router.get('/me/stats', requireRole('driver'), driverController.getMyStats)

export default router
