import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import env from './config/env.js'
import routes from './routes/index.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const app = express()

app.set('trust proxy', 1)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (curl, Postman, same-origin) is always allowed.
      if (!origin) return callback(null, true)
      if (!env.corsOrigins.length || env.corsOrigins.includes(origin)) {
        return callback(null, true)
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`))
    },
    credentials: true,
  }),
)

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

if (!env.isProd) app.use(morgan('dev'))

/**
 * Location PATCHes arrive every few seconds per active ride, so the general
 * limiter is generous and auth gets its own much tighter bucket.
 */
app.use(
  '/api',
  rateLimit({
    windowMs: 60_000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests — slow down a moment' },
  }),
)

app.use(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60_000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many sign-in attempts. Try again in a few minutes.',
    },
  }),
)

app.get('/', (_req, res) => {
  res.json({ success: true, service: 'MediAssist API', docs: '/api/health' })
})

app.use('/api', routes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
