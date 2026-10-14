import User from '../models/User.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import { verifyToken } from '../utils/token.js'

function extractToken(req) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) return header.slice(7).trim()
  return null
}

/** Rejects the request unless a valid JWT resolves to an existing user. */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req)
  if (!token) throw ApiError.unauthorized('Authentication token missing')

  let payload
  try {
    payload = verifyToken(token)
  } catch {
    throw ApiError.unauthorized('Session expired or token invalid')
  }

  const user = await User.findById(payload.sub)
  if (!user) throw ApiError.unauthorized('Account no longer exists')

  req.user = user
  next()
})

/** Attaches `req.user` when a token is present, but never rejects. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req)
  if (!token) return next()
  try {
    const payload = verifyToken(token)
    req.user = await User.findById(payload.sub)
  } catch {
    req.user = null
  }
  next()
})

/** Route guard: `requireRole('hospital')`, `requireRole('driver', 'hospital')`. */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized())
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`This action is restricted to: ${roles.join(', ')}`),
      )
    }
    next()
  }
}
