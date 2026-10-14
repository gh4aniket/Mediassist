/**
 * One module per backend resource. Pages import from here rather than calling
 * `fetch` directly, so every URL the app talks to lives in a single place.
 */
import api from './apiClient'

export { default as api, ApiError, getToken, setToken, clearToken } from './apiClient'

/* ----------------------------------------------------------------- auth */

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (payload) => api.post('/auth/register', payload),
  me: () => api.get('/auth/me'),
  updateMe: (updates) => api.patch('/auth/me', updates),
  changePassword: (currentPassword, newPassword) =>
    api.patch('/auth/me/password', { currentPassword, newPassword }),
}

/* ------------------------------------------------------------ hospitals */

export const hospitalApi = {
  list: (params, options) => api.get('/hospitals', { params, ...options }),
  get: (id, options) => api.get(`/hospitals/${id}`, options),
  create: (payload) => api.post('/hospitals', payload),
  update: (id, updates) => api.patch(`/hospitals/${id}`, updates),
  updateBeds: (id, beds) => api.patch(`/hospitals/${id}/beds`, beds),
  updateLocation: (id, coordinates) => api.patch(`/hospitals/${id}/location`, coordinates),
  summary: (id, options) => api.get(`/hospitals/${id}/summary`, options),
  updates: (id, limit) => api.get(`/hospitals/${id}/updates`, { params: { limit } }),
  getSettings: (id) => api.get(`/hospitals/${id}/settings`),
  saveSettings: (id, settings) => api.put(`/hospitals/${id}/settings`, settings),
}

/* -------------------------------------------------------------- doctors */

export const doctorApi = {
  listForHospital: (hospitalId, options) => api.get(`/hospitals/${hospitalId}/doctors`, options),
  create: (hospitalId, payload) => api.post(`/hospitals/${hospitalId}/doctors`, payload),
  update: (id, updates) => api.patch(`/doctors/${id}`, updates),
  remove: (id) => api.delete(`/doctors/${id}`),
}

/* ---------------------------------------------------------------- staff */

export const staffApi = {
  listForHospital: (hospitalId, params, options) =>
    api.getRaw(`/hospitals/${hospitalId}/staff`, { params, ...options }),
  create: (hospitalId, payload) => api.post(`/hospitals/${hospitalId}/staff`, payload),
  update: (id, updates) => api.patch(`/staff/${id}`, updates),
  remove: (id) => api.delete(`/staff/${id}`),
}

/* ------------------------------------------------------------- bookings */

export const bookingApi = {
  create: (payload) => api.postRaw('/bookings', payload),
  list: (params, options) => api.get('/bookings', { params, ...options }),
  active: (options) => api.get('/bookings/active', options),
  incoming: (options) => api.getRaw('/bookings/incoming', options),
  get: (id) => api.get(`/bookings/${id}`),
  /** Patient poll — called on a ~10 s interval while a ride is live. */
  track: (id, signal) => api.get(`/bookings/${id}/track`, { signal }),
  /** Driver stream — pushed as the ambulance moves. */
  pushDriverLocation: (id, point) => api.patch(`/bookings/${id}/driver-location`, point),
  pushPatientLocation: (id, point) => api.patch(`/bookings/${id}/patient-location`, point),
  accept: (id, point) => api.post(`/bookings/${id}/accept`, point || {}),
  reject: (id) => api.post(`/bookings/${id}/reject`, {}),
  setStatus: (id, status) => api.patch(`/bookings/${id}/status`, { status }),
  cancel: (id, reason) => api.post(`/bookings/${id}/cancel`, { reason }),
  myStats: (options) => api.get('/bookings/stats/me', options),
}

/* -------------------------------------------------------------- drivers */

export const driverApi = {
  setAvailability: (availability, location) =>
    api.patch('/drivers/me/availability', { availability, ...(location || {}) }),
  pushLocation: (point) => api.patch('/drivers/me/location', point),
  stats: (options) => api.get('/drivers/me/stats', options),
  list: (params) => api.get('/drivers', { params }),
}

/* ------------------------------------------------------ medical profile */

export const medicalProfileApi = {
  me: (options) => api.get('/medical-profile/me', options),
  save: (profile) => api.put('/medical-profile/me', profile),
  completeness: (options) => api.get('/medical-profile/me/completeness', options),
  forPatient: (patientId) => api.get(`/medical-profile/${patientId}`),
}

/* ------------------------------------------------------------ assistant */

export const assistantApi = {
  welcome: () => api.get('/assistant/welcome'),
  suggestions: () => api.get('/assistant/suggestions'),
  chat: (message) => api.postRaw('/assistant/chat', { message }),
}

/* ------------------------------------------------------------- activity */

export const activityApi = {
  mine: (limit, options) => api.get('/activity/me', { params: { limit }, ...options }),
}
