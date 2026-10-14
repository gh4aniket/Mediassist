import mongoose from 'mongoose'
import toClientPlugin from './plugins/toClient.js'

const { Schema } = mongoose

export const STAFF_STATUSES = ['active', 'inactive', 'on-leave']

const staffSchema = new Schema(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
    /** Present when the staff member also has a login account. */
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, trim: true, default: 'Staff' },
    department: { type: String, trim: true, default: 'General' },
    status: { type: String, enum: STAFF_STATUSES, default: 'active', index: true },
    phone: { type: String, trim: true },
    joinDate: { type: String, trim: true },
    avatar: { type: String, trim: true },
  },
  { timestamps: true },
)

staffSchema.plugin(toClientPlugin)
staffSchema.index({ hospitalId: 1, email: 1 }, { unique: true })

export default mongoose.model('Staff', staffSchema)
