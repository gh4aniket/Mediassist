import mongoose from 'mongoose'
import toClientPlugin from './plugins/toClient.js'
import { relativeTime } from '../utils/time.js'

const { Schema } = mongoose

/**
 * Backs two feeds that look the same to the UI: the patient's "Recent Activity"
 * list and the hospital dashboard's "Recent Updates" list. `scope` says which.
 */
const activitySchema = new Schema(
  {
    scope: { type: String, enum: ['patient', 'hospital'], required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', index: true },
    /** patient: request | profile | hospital — hospital: bed | staff | doctor | profile */
    type: { type: String, required: true },
    message: { type: String, required: true, trim: true },
    /** Icon key the frontend maps to a lucide component. */
    icon: { type: String, trim: true },
  },
  { timestamps: true },
)

activitySchema.plugin(toClientPlugin)
activitySchema.index({ scope: 1, createdAt: -1 })

activitySchema.virtual('time').get(function time() {
  return relativeTime(this.createdAt)
})

activitySchema.statics.record = function record(entry) {
  // Activity is a nicety, never a reason to fail the request that produced it.
  return this.create(entry).catch((err) => {
    console.warn('[activity] could not record entry:', err.message)
    return null
  })
}

export default mongoose.model('Activity', activitySchema)
