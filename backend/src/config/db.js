import mongoose from 'mongoose'
import env from './env.js'

mongoose.set('strictQuery', true)

export async function connectDatabase() {
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  })
  const { name, host } = mongoose.connection
  console.log(`[db] connected to "${name}" at ${host}`)
  return mongoose.connection
}

export async function disconnectDatabase() {
  await mongoose.disconnect()
}
