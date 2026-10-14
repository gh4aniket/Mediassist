import { useEffect, useMemo, useRef } from 'react'

const MARKER_COLORS = {
  patient: '#0891b2',
  ambulance: '#dc2626',
  hospital: '#059669',
  pickup: '#7c3aed',
  default: '#0891b2',
}

function markerIcon(L, { type = 'default', label }) {
  const color = MARKER_COLORS[type] || MARKER_COLORS.default
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 36px; height: 36px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      ">
        <div style="
          width: 10px; height: 10px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
      ${label ? `<div style="
        position: absolute; top: 40px; left: 50%; transform: translateX(-50%);
        background: white; padding: 2px 8px; border-radius: 8px;
        font-size: 11px; font-weight: 600; color: #1e293b;
        white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,0.2);
      ">${label}</div>` : ''}
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -40],
  })
}

/**
 * Leaflet map wrapper. Leaflet itself is loaded from a CDN in index.html, so it
 * arrives on `window.L`.
 *
 * Markers are keyed by `type` so a moving marker (the ambulance during live
 * tracking) is *repositioned* rather than destroyed and rebuilt on every poll —
 * that keeps the pin from flickering every ten seconds.
 */
export default function MapContainer({
  center = [42.3601, -71.0589],
  zoom = 14,
  markers = [],
  className = '',
  onMapReady,
  /** Re-fit the viewport when the set of markers changes shape. */
  autoFit = true,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRefs = useRef(new Map())
  const routeRef = useRef(null)
  const lastFitKey = useRef('')

  // Stable dependency: re-run marker sync only when coordinates actually change.
  const markerKey = useMemo(
    () => markers.map((m) => `${m.type}:${m.lat?.toFixed(6)},${m.lng?.toFixed(6)}:${m.label || ''}`).join('|'),
    [markers],
  )
  const shapeKey = useMemo(() => markers.map((m) => m.type).join('|'), [markers])

  useEffect(() => {
    const L = window.L
    if (!L || !containerRef.current || mapRef.current) return undefined

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map
    onMapReady?.(map)

    /**
     * The map is usually created while its flex parent is still settling, so
     * Leaflet caches a stale size and only paints a strip of tiles. Watching the
     * container and invalidating on every resize keeps the canvas correct through
     * layout changes and window resizes alike.
     */
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(containerRef.current)
    const initialFix = setTimeout(() => map.invalidateSize(), 150)

    return () => {
      clearTimeout(initialFix)
      observer.disconnect()
      map.remove()
      mapRef.current = null
      markerRefs.current.clear()
      routeRef.current = null
    }
    // Mount once; `center`/`zoom` changes are handled by the fit effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const L = window.L
    if (!map || !L) return

    const valid = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))
    const seen = new Set()

    valid.forEach((marker, index) => {
      const key = marker.type ? `${marker.type}-${index}` : `marker-${index}`
      seen.add(key)

      const existing = markerRefs.current.get(key)
      if (existing) {
        existing.setLatLng([marker.lat, marker.lng])
        existing.setIcon(markerIcon(L, marker))
        if (marker.popup) existing.bindPopup(`<div style="font-size:13px;padding:4px">${marker.popup}</div>`)
      } else {
        const created = L.marker([marker.lat, marker.lng], { icon: markerIcon(L, marker) }).addTo(map)
        if (marker.popup) created.bindPopup(`<div style="font-size:13px;padding:4px">${marker.popup}</div>`)
        markerRefs.current.set(key, created)
      }
    })

    // Drop markers that are no longer in the list.
    for (const [key, instance] of markerRefs.current.entries()) {
      if (!seen.has(key)) {
        instance.remove()
        markerRefs.current.delete(key)
      }
    }

    // Dashed line between the two ends of a trip.
    if (routeRef.current) {
      routeRef.current.remove()
      routeRef.current = null
    }
    if (valid.length >= 2) {
      routeRef.current = L.polyline(
        valid.map((m) => [m.lat, m.lng]),
        { color: '#0891b2', weight: 4, opacity: 0.7, dashArray: '8, 6' },
      ).addTo(map)
    }

    if (!autoFit || !valid.length) return

    // Only re-frame when the composition changes, so a live position update
    // does not yank the viewport away from wherever the user panned...
    if (shapeKey !== lastFitKey.current) {
      lastFitKey.current = shapeKey
      if (valid.length === 1) {
        map.setView([valid[0].lat, valid[0].lng], zoom)
      } else {
        map.fitBounds(
          valid.map((m) => [m.lat, m.lng]),
          { padding: [48, 48], maxZoom: 16 },
        )
      }
      return
    }

    // ...but a lone marker that has moved out of view (the hospital location
    // picker jumping to a fresh GPS fix) is worth following.
    if (valid.length === 1) {
      const point = window.L.latLng(valid[0].lat, valid[0].lng)
      if (!map.getBounds().pad(-0.15).contains(point)) map.panTo(point)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerKey, shapeKey, autoFit, zoom])

  return (
    <div className={`relative rounded-xl overflow-hidden bg-slate-100 ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
      {!window.L && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <p className="text-sm text-slate-400">Loading map...</p>
        </div>
      )}
    </div>
  )
}
