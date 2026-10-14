import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

function num(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediassist',
  jwtSecret: process.env.JWT_SECRET || 'mediassist-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins: (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  ragServiceUrl: (process.env.RAG_SERVICE_URL || '').replace(/\/+$/, ''),
  ragTimeoutMs: num(process.env.RAG_SERVICE_TIMEOUT_MS, 15000),
  driverLocationStaleSeconds: num(process.env.DRIVER_LOCATION_STALE_SECONDS, 60),
  averageAmbulanceSpeedKmph: num(process.env.AVERAGE_AMBULANCE_SPEED_KMPH, 40),
}

env.isProd = env.nodeEnv === 'production'

export default env
