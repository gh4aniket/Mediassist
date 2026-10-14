import env from '../config/env.js'

const EARTH_RADIUS_KM = 6371

const toRad = (deg) => (deg * Math.PI) / 180

/** Great-circle distance in kilometres between two {lat, lng} points. */
export function distanceKm(a, b) {
  if (!isValidPoint(a) || !isValidPoint(b)) return null
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function isValidPoint(point) {
  return (
    point &&
    typeof point.lat === 'number' &&
    typeof point.lng === 'number' &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
  )
}

/** "2.3 km" / "480 m" — matches the strings the frontend renders verbatim. */
export function formatDistance(km) {
  if (km === null || km === undefined) return null
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

/**
 * Rough ETA from straight-line distance. Real routing is out of scope; a constant
 * average speed keeps the ETA stable and explainable during the demo.
 */
export function etaMinutes(km) {
  if (km === null || km === undefined) return null
  const minutes = (km / env.averageAmbulanceSpeedKmph) * 60
  return Math.max(1, Math.round(minutes))
}

export function formatEta(km) {
  const minutes = etaMinutes(km)
  return minutes === null ? null : `${minutes} min`
}

/** Normalises whatever the client sent into a `{ lat, lng }` pair or null. */
export function normalisePoint(input) {
  if (!input) return null
  const lat = Number(input.lat ?? input.latitude)
  const lng = Number(input.lng ?? input.longitude ?? input.lon)
  const point = { lat, lng }
  return isValidPoint(point) ? point : null
}
