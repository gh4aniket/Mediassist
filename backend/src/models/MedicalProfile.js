import mongoose from 'mongoose'
import toClientPlugin from './plugins/toClient.js'

const { Schema } = mongoose

/**
 * Sub-documents get the same `_id` -> `id` treatment as top-level documents:
 * the frontend keys medication and contact rows by `id` when editing them.
 */
const subdocJson = {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
}

const medicationSchema = new Schema(
  {
    name: { type: String, trim: true },
    dosage: { type: String, trim: true },
    frequency: { type: String, trim: true },
  },
  { _id: true, toJSON: subdocJson },
)

const contactSchema = new Schema(
  {
    name: { type: String, trim: true },
    relationship: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: true, toJSON: subdocJson },
)

const medicalProfileSchema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    bloodGroup: { type: String, trim: true },
    height: { type: String, trim: true },
    weight: { type: String, trim: true },
    allergies: { type: [String], default: [] },
    conditions: { type: [String], default: [] },
    medications: { type: [medicationSchema], default: [] },
    emergencyContacts: { type: [contactSchema], default: [] },
  },
  { timestamps: true },
)

medicalProfileSchema.plugin(toClientPlugin)

/** The abbreviated view a responder sees on a live booking. */
medicalProfileSchema.methods.toResponderSnapshot = function toResponderSnapshot() {
  return {
    bloodGroup: this.bloodGroup || null,
    allergies: this.allergies || [],
    conditions: this.conditions || [],
  }
}

export default mongoose.model('MedicalProfile', medicalProfileSchema)
