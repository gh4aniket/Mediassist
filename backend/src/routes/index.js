import { Router } from 'express'
import mongoose from 'mongoose'
import authRoutes from './authRoutes.js'
import hospitalRoutes from './hospitalRoutes.js'
import doctorRoutes from './doctorRoutes.js'
import staffRoutes from './staffRoutes.js'
import bookingRoutes from './bookingRoutes.js'
import driverRoutes from './driverRoutes.js'
import medicalProfileRoutes from './medicalProfileRoutes.js'
import assistantRoutes from './assistantRoutes.js'
import activityRoutes from './activityRoutes.js'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    state: 'ok',
    database: mongoose.STATES[mongoose.connection.readyState],
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  })
})

router.use('/auth', authRoutes)
router.use('/hospitals', hospitalRoutes)
router.use('/doctors', doctorRoutes)
router.use('/staff', staffRoutes)
router.use('/bookings', bookingRoutes)
router.use('/drivers', driverRoutes)
router.use('/medical-profile', medicalProfileRoutes)
router.use('/assistant', assistantRoutes)
router.use('/activity', activityRoutes)

export default router
