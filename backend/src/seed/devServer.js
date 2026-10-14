/**
 * Boots the API against a throwaway in-memory MongoDB, seeded with the demo
 * fixtures. Handy when you want to run the whole stack without installing
 * MongoDB — nothing is persisted, so every restart is a clean slate.
 *
 *   npm run dev:memory
 *
 * For real work use `npm run dev` with MONGODB_URI pointing at a real database.
 */
import { MongoMemoryServer } from 'mongodb-memory-server'

async function main() {
  console.log('[dev] starting in-memory MongoDB (first run downloads the binary)...')
  const mongo = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongo.getUri('mediassist')

  const { connectDatabase } = await import('../config/db.js')
  await connectDatabase()

  // Seed straight through the models rather than shelling out to seed.js, so
  // both processes share this one connection.
  const { seedAll } = await import('./seedRunner.js')
  await seedAll()

  const { default: app } = await import('../app.js')
  const { default: env } = await import('../config/env.js')

  const server = app.listen(env.port, () => {
    console.log(`\n[dev] MediAssist API (in-memory) on http://localhost:${env.port}`)
    console.log('[dev] demo logins — password: demo123')
    console.log('      patient@demo.com | hospital@demo.com | driver@demo.com | driver2@demo.com')
    console.log('[dev] data is discarded when this process exits\n')
  })

  const shutdown = async () => {
    server.close()
    await mongo.stop()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('[dev] failed to start:', err)
  process.exit(1)
})
