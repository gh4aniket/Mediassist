import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import toClientPlugin from './plugins/toClient.js'

const { Schema } = mongoose

export const USER_ROLES = ['patient', 'hospital', 'driver']
export const DRIVER_AVAILABILITY = ['available', 'busy', 'offline']

const pointSchema = new Schema(
  {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
    accuracy: Number,
    updatedAt: Date,
  },
  { _id: false },
)

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: USER_ROLES, required: true, index: true },
    avatar: { type: String, trim: true },

    // patient-only
    address: { type: String, trim: true },
    dateOfBirth: { type: String, trim: true },
    gender: { type: String, trim: true },

    // hospital-staff-only
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', index: true },
    staffRole: { type: String, trim: true },

    // driver-only
    vehicleId: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    experience: { type: String, trim: true },
    certifications: { type: String, trim: true },
    availability: {
      type: String,
      enum: DRIVER_AVAILABILITY,
      default: 'offline',
      index: true,
    },
    /**
     * `true` while the driver is committed to a booking. Dispatch fans a new
     * request out to every driver with availability "available" AND assigned
     * false — no geospatial query involved, per the agreed design.
     */
    assigned: { type: Boolean, default: false, index: true },
    currentLocation: { type: pointSchema, default: undefined },
    stats: {
      totalTrips: { type: Number, default: 0 },
      tripsToday: { type: Number, default: 0 },
      tripsThisWeek: { type: Number, default: 0 },
      rating: { type: Number, default: 5 },
      acceptedCount: { type: Number, default: 0 },
      offeredCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
)

userSchema.plugin(toClientPlugin, { hide: ['passwordHash'] })

/** Fields that only make sense for one role, so the others do not carry them. */
const ROLE_ONLY_FIELDS = {
  patient: ['address', 'dateOfBirth', 'gender'],
  hospital: ['hospitalId', 'staffRole'],
  driver: [
    'vehicleId',
    'licenseNumber',
    'experience',
    'certifications',
    'availability',
    'assigned',
    'currentLocation',
    'stats',
    'acceptanceRate',
  ],
}

const ALL_ROLE_FIELDS = new Set(Object.values(ROLE_ONLY_FIELDS).flat())

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(doc, ret) {
    ret.id = String(ret._id)
    delete ret._id
    delete ret.passwordHash

    const keep = new Set(ROLE_ONLY_FIELDS[ret.role] || [])
    for (const field of ALL_ROLE_FIELDS) {
      if (!keep.has(field)) delete ret[field]
    }
    return ret
  },
})

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10)
}

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash)
}

/** Driver card as the patient-facing booking payload expects it. */
userSchema.methods.toDriverCard = function toDriverCard() {
  return {
    id: String(this._id),
    name: this.name,
    vehicleId: this.vehicleId,
    phone: this.phone,
    avatar: this.avatar,
    rating: this.stats?.rating ?? 5,
  }
}

userSchema.virtual('acceptanceRate').get(function acceptanceRate() {
  const offered = this.stats?.offeredCount || 0
  if (!offered) return 100
  return Math.round(((this.stats?.acceptedCount || 0) / offered) * 100)
})

export default mongoose.model('User', userSchema)
