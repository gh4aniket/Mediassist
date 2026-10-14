import { Router } from 'express'
import * as assistantController from '../controllers/assistantController.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'

const router = Router()

router.use(requireAuth)

router.get('/welcome', assistantController.welcome)
router.get('/suggestions', assistantController.suggestions)

router.post(
  '/chat',
  validateBody({
    message: { required: true, minLength: 1, maxLength: 2000 },
  }),
  assistantController.chat,
)

export default router
