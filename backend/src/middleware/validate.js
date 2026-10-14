import ApiError from '../utils/ApiError.js'

/**
 * Tiny declarative body validator — enough for this surface without pulling in
 * a schema library. A rule is `{ required, type, enum, min, max, minLength,
 * maxLength, pattern, message }`.
 */
export function validateBody(rules) {
  return (req, _res, next) => {
    const errors = {}
    const body = req.body || {}

    for (const [field, rule] of Object.entries(rules)) {
      const value = body[field]
      const missing = value === undefined || value === null || value === ''

      if (rule.required && missing) {
        errors[field] = rule.message || `${field} is required`
        continue
      }
      if (missing) continue

      if (rule.type === 'number' && !Number.isFinite(Number(value))) {
        errors[field] = rule.message || `${field} must be a number`
        continue
      }
      if (rule.type === 'array' && !Array.isArray(value)) {
        errors[field] = rule.message || `${field} must be an array`
        continue
      }
      if (rule.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
        errors[field] = rule.message || `${field} must be an object`
        continue
      }
      if (rule.type === 'email' && !/^\S+@\S+\.\S+$/.test(String(value))) {
        errors[field] = rule.message || 'Enter a valid email address'
        continue
      }
      if (rule.enum && !rule.enum.includes(value)) {
        errors[field] = rule.message || `${field} must be one of: ${rule.enum.join(', ')}`
        continue
      }
      if (rule.minLength && String(value).length < rule.minLength) {
        errors[field] = rule.message || `${field} must be at least ${rule.minLength} characters`
        continue
      }
      if (rule.maxLength && String(value).length > rule.maxLength) {
        errors[field] = rule.message || `${field} must be at most ${rule.maxLength} characters`
        continue
      }
      if (rule.min !== undefined && Number(value) < rule.min) {
        errors[field] = rule.message || `${field} must be at least ${rule.min}`
        continue
      }
      if (rule.max !== undefined && Number(value) > rule.max) {
        errors[field] = rule.message || `${field} must be at most ${rule.max}`
        continue
      }
      if (rule.pattern && !rule.pattern.test(String(value))) {
        errors[field] = rule.message || `${field} is not in the expected format`
      }
    }

    if (Object.keys(errors).length) {
      return next(ApiError.badRequest('Validation failed', errors))
    }
    next()
  }
}

/** Guards `:param` values that are fed straight into Mongoose queries. */
export function validateObjectId(param = 'id') {
  return (req, _res, next) => {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params[param] || '')) {
      return next(ApiError.badRequest(`"${req.params[param]}" is not a valid id`))
    }
    next()
  }
}
