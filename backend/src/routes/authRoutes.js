import { Router } from 'express'
import * as authController from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { USER_ROLES } from '../models/User.js'

const router = Router()

router.post(
  '/register',
  validateBody({
    name: { required: true, minLength: 2 },
    email: { required: true, type: 'email' },
    password: { required: true, minLength: 6, message: 'Password must be at least 6 characters' },
    phone: { required: true },
    role: { required: true, enum: USER_ROLES },
  }),
  authController.register,
)

router.post(
  '/login',
  validateBody({
    email: { required: true, type: 'email' },
    password: { required: true },
  }),
  authController.login,
)

router.get('/me', requireAuth, authController.me)
router.patch('/me', requireAuth, authController.updateMe)

router.patch(
  '/me/password',
  requireAuth,
  validateBody({
    currentPassword: { required: true },
    newPassword: { required: true, minLength: 6 },
  }),
  authController.changePassword,
)

export default router
