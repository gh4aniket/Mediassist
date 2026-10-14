import mongoose from 'mongoose'
import toClientPlugin from './plugins/toClient.js'
import { distanceKm, formatDistance, formatEta } from '../utils/geo.js'

const { Schema } = mongoose

export const BOOKING_STATUSES = [
  'pending',
  'matched',
  'en-route',
  'arrived',
  'completed',
  'cancelled',
]

/** Statuses in which a booking is still running and blocks its driver. */
export const ACTIVE_STATUSES = ['pending', 'matched', 'en-route', 'arrived']

/** Labels the frontend Timeline component matches on, keyed by status. */
export const TIMELINE_LABELS = {
  pending: 'Pending',
  matched: 'Matched',
  'en-route': 'En Route',
  arrived: 'Arrived',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const livePointSchema = new Schema(
  {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
    accuracy: Number,
    heading: Number,
    speed: Number,
    updatedAt: Date,
  },
  { _id: false },
)

const pickupSchema = new Schema(
  {
    address: { type: String, trim: true },
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
)

const timelineEntrySchema = new Schema(
  {
    status: { type: String, required: true },
    time: { type: Date, default: Date.now },
    description: { type: String, trim: true },
  },
  { _id: false },
)

const bookingSchema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Frozen at request time so history stays readable if the user changes. */
    patientSnapshot: {
      name: String,
      phone: String,
      avatar: String,
    },

    driverId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    driverSnapshot: {
      name: String,
      vehicleId: String,
      phone: String,
      avatar: String,
      rating: Number,
    },

    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', default: null },
    /** Denormalised name — the frontend renders `request.hospital` as a string. */
    hospitalName: { type: String, trim: true },

    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'pending',
      index: true,
    },

    /** Where the patient asked to be picked up (set once, at creation). */
    pickupLocation: { type: pickupSchema, required: true },

    /**
     * Live coordinates for both sides of the ride. The patient PATCHes their own
     * position, the driver PATCHes theirs every few seconds while moving, and the
     * patient polls GET /:id/track to read the driver's latest fix. No websockets
     * involved — polling keeps the contract trivially debuggable.
     */
    patientLocation: { type: livePointSchema, default: undefined },
    driverLocation: { type: livePointSchema, default: undefined },

    emergencyType: { type: String, trim: true, default: 'Medical Emergency' },
    emergencyNote: { type: String, trim: true, maxlength: 500 },

    /** Human-readable "6 min", recomputed whenever the driver reports a fix. */
    eta: { type: String, default: null },
    etaMinutes: { type: Number, default: null },
    distanceKm: { type: Number, default: null },

    timeline: { type: [timelineEntrySchema], default: [] },

    /** Drivers who declined — they stop seeing this request in their feed. */
    rejectedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    matchedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelReason: { type: String, trim: true },
  },
  { timestamps: true },
)

bookingSchema.plugin(toClientPlugin)
bookingSchema.index({ patientId: 1, createdAt: -1 })
bookingSchema.index({ status: 1, createdAt: -1 })

bookingSchema.methods.pushTimeline = function pushTimeline(status, description) {
  const label = TIMELINE_LABELS[status] || status
  this.timeline.push({ status: label, time: new Date(), description })
  return this
}

/** Recomputes distance/ETA between the driver's latest fix and the pickup point. */
bookingSchema.methods.refreshEta = function refreshEta() {
  const from = this.driverLocation
  const arrivedAlready = this.status === 'arrived' || this.status === 'completed'

  if (!from || from.lat === undefined || arrivedAlready) {
    if (arrivedAlready) {
      this.eta = null
      this.etaMinutes = 0
    }
    return this
  }

  const to = { lat: this.pickupLocation?.lat, lng: this.pickupLocation?.lng }
  const km = distanceKm({ lat: from.lat, lng: from.lng }, to)
  if (km === null) return this

  this.distanceKm = Number(km.toFixed(2))
  this.eta = formatEta(km)
  this.etaMinutes = this.eta ? Number.parseInt(this.eta, 10) : null
  return this
}

const asId = (value) => (value ? String(value._id || value) : null)

const asLivePoint = (point) =>
  point && point.lat !== undefined
    ? { lat: point.lat, lng: point.lng, updatedAt: point.updatedAt || null }
    : null

/** Payload shape consumed by the patient dashboard, tracking and history pages. */
bookingSchema.methods.toPatientView = function toPatientView() {
  return {
    id: String(this._id),
    patientId: asId(this.patientId),
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    pickupLocation: {
      address: this.pickupLocation?.address || '',
      lat: this.pickupLocation?.lat,
      lng: this.pickupLocation?.lng,
    },
    patientLocation: asLivePoint(this.patientLocation),
    driverLocation: asLivePoint(this.driverLocation),
    hospital: this.hospitalName || null,
    hospitalId: asId(this.hospitalId),
    driver: this.driverId
      ? {
          id: asId(this.driverId),
          name: this.driverSnapshot?.name,
          vehicleId: this.driverSnapshot?.vehicleId,
          phone: this.driverSnapshot?.phone,
          avatar: this.driverSnapshot?.avatar,
          rating: this.driverSnapshot?.rating ?? 5,
        }
      : null,
    emergencyType: this.emergencyType,
    emergencyNote: this.emergencyNote || '',
    eta: this.eta,
    distance: this.distanceKm === null ? null : formatDistance(this.distanceKm),
    timeline: (this.timeline || []).map((entry) => ({
      status: entry.status,
      time: entry.time,
      description: entry.description,
    })),
  }
}

/**
 * Payload the driver console consumes — mirrors the `mockIncomingRequests` shape.
 * `viewerLocation` lets us show distance relative to *this* driver.
 */
bookingSchema.methods.toDriverView = function toDriverView(viewerLocation, medicalInfo) {
  const pickup = { lat: this.pickupLocation?.lat, lng: this.pickupLocation?.lng }
  const km = viewerLocation ? distanceKm(viewerLocation, pickup) : this.distanceKm

  return {
    id: String(this._id),
    bookingId: String(this._id),
    status: this.status,
    patientId: asId(this.patientId),
    patientName: this.patientSnapshot?.name || 'Patient',
    patientPhone: this.patientSnapshot?.phone || '',
    pickupAddress: this.pickupLocation?.address || '',
    coordinates: pickup,
    patientLocation: asLivePoint(this.patientLocation),
    driverLocation: asLivePoint(this.driverLocation),
    distance: formatDistance(km),
    distanceKm: km === null || km === undefined ? null : Number(km.toFixed(2)),
    eta: formatEta(km),
    emergencyType: this.emergencyType,
    emergencyNote: this.emergencyNote || '',
    hospital: this.hospitalName || null,
    hospitalId: asId(this.hospitalId),
    createdAt: this.createdAt,
    timeline: (this.timeline || []).map((entry) => ({
      status: entry.status,
      time: entry.time,
      description: entry.description,
    })),
    medicalInfo: medicalInfo || null,
  }
}

export default mongoose.model('Booking', bookingSchema)
