import mongoose from 'mongoose'
import toClientPlugin from './plugins/toClient.js'

const { Schema } = mongoose

const doctorSchema = new Schema(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    specialization: { type: String, trim: true },
    qualifications: { type: String, trim: true },
    experience: { type: String, trim: true },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    availability: { type: String, trim: true },
  },
  { timestamps: true },
)

doctorSchema.plugin(toClientPlugin)

export default mongoose.model('Doctor', doctorSchema)
