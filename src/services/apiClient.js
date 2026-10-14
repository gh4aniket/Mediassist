/**
 * Thin fetch wrapper around the MediAssist REST API.
 *
 * The backend answers `{ success, data, meta?, message? }`; every helper here
 * returns the `data` payload directly and throws an `ApiError` otherwise, so
 * callers can `try { const x = await api.get(...) } catch (err) { ... }`.
 */

const BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/+$/, '')

const TOKEN_KEY = 'mediassist_token'

export class ApiError extends Error {
  constructor(message, { status, errors, body } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors || null
    this.body = body
  }
}

/* --------------------------------------------------------------- token */

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token, { remember = false } = {}) {
  try {
    clearToken()
    const store = remember ? localStorage : sessionStorage
    store.setItem(TOKEN_KEY, token)
  } catch {
    /* private browsing — the session simply will not survive a reload */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

/* -------------------------------------------------------------- request */

/** Called when the API rejects our token, so the app can bounce to /login. */
let onUnauthorized = null
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

function buildUrl(path, params) {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  if (!params) return url

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.append(key, value)
  }
  const qs = search.toString()
  return qs ? `${url}?${qs}` : url
}

async function request(method, path, { body, params, signal, raw } = {}) {
  const token = getToken()

  let response
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError(
      'Cannot reach the MediAssist server. Check that the backend is running.',
      { status: 0 },
    )
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401) {
      clearToken()
      onUnauthorized?.()
    }
    throw new ApiError(payload?.message || `Request failed (${response.status})`, {
      status: response.status,
      errors: payload?.errors,
      body: payload,
    })
  }

  if (raw) return payload

  // `data: null` is a legitimate answer ("no active booking"), so unwrap on the
  // presence of the key rather than on the value being non-null.
  return payload && typeof payload === 'object' && 'data' in payload
    ? payload.data
    : payload
}

const api = {
  get: (path, options) => request('GET', path, options),
  post: (path, body, options) => request('POST', path, { ...options, body }),
  put: (path, body, options) => request('PUT', path, { ...options, body }),
  patch: (path, body, options) => request('PATCH', path, { ...options, body }),
  delete: (path, options) => request('DELETE', path, options),
  /** Same as `get`, but keeps `meta`/`count` alongside `data`. */
  getRaw: (path, options) => request('GET', path, { ...options, raw: true }),
  postRaw: (path, body, options) => request('POST', path, { ...options, body, raw: true }),
}

export default api
