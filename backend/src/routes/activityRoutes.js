import { Router } from 'express'
import * as activityController from '../controllers/activityController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/me', requireAuth, activityController.listMyActivity)

export default router
