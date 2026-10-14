import mongoose from 'mongoose'
import toClientPlugin from './plugins/toClient.js'

const { Schema } = mongoose

const wardSchema = new Schema(
  {
    total: { type: Number, default: 0, min: 0 },
    available: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
)

const coordinatesSchema = new Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
)

const settingsSchema = new Schema(
  {
    notifyLowBeds: { type: Boolean, default: true },
    lowBedThreshold: { type: Number, default: 10, min: 0 },
    notifyNewRequests: { type: Boolean, default: true },
    publicListing: { type: Boolean, default: true },
    showBedCounts: { type: Boolean, default: true },
    showDoctors: { type: Boolean, default: true },
    autoUpdateInterval: { type: Number, default: 30 },
    timezone: { type: String, default: 'America/New_York' },
    language: { type: String, default: 'en' },
  },
  { _id: false },
)

const hospitalSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true },
    type: { type: String, trim: true, default: 'General Hospital' },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    description: { type: String, trim: true },
    about: { type: String, trim: true },
    beds: {
      icu: { type: wardSchema, default: () => ({}) },
      general: { type: wardSchema, default: () => ({}) },
      emergency: { type: wardSchema, default: () => ({}) },
    },
    services: { type: [String], default: [] },
    facilities: { type: [String], default: [] },
    images: { type: [String], default: [] },
    /**
     * Plain lat/lng (not GeoJSON) so the payload drops straight into the
     * Leaflet markers the frontend already builds. Settable from the browser's
     * live position via PATCH /api/hospitals/:id/location.
     */
    coordinates: { type: coordinatesSchema, default: undefined },
    verified: { type: Boolean, default: false },
    established: { type: String, trim: true },
    settings: { type: settingsSchema, default: () => ({}) },
    /** Distinct from `updatedAt`: only bumped when capacity actually changes. */
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

hospitalSchema.plugin(toClientPlugin)

hospitalSchema.virtual('totalBeds').get(function totalBeds() {
  const b = this.beds || {}
  return (b.icu?.total || 0) + (b.general?.total || 0) + (b.emergency?.total || 0)
})

hospitalSchema.virtual('availableBeds').get(function availableBeds() {
  const b = this.beds || {}
  return (b.icu?.available || 0) + (b.general?.available || 0) + (b.emergency?.available || 0)
})

hospitalSchema.virtual('occupancyRate').get(function occupancyRate() {
  const total = this.totalBeds
  if (!total) return 0
  return Math.round(((total - this.availableBeds) / total) * 100)
})

export default mongoose.model('Hospital', hospitalSchema)
