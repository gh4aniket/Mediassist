#!/usr/bin/env node
/**
 * Seeds the database with the demo fixtures.
 *
 *   npm run seed         # no-op if the database already has users
 *   npm run seed:fresh   # wipes the collections first
 */
import { connectDatabase, disconnectDatabase } from '../config/db.js'
import { seedAll } from './seedRunner.js'

const fresh = process.argv.includes('--fresh')

async function run() {
  await connectDatabase()

  const seeded = await seedAll({ fresh })

  if (seeded) {
    console.log('\n[seed] done. Demo accounts (password: demo123):')
    console.log('       patient@demo.com   — patient portal')
    console.log('       hospital@demo.com  — hospital staff dashboard')
    console.log('       driver@demo.com    — driver console')
    console.log('       driver2@demo.com   — second driver, for testing dispatch fan-out')
  } else {
    console.log('       Re-run with `npm run seed:fresh` to wipe and reseed.')
  }

  await disconnectDatabase()
}

run().catch(async (err) => {
  console.error('[seed] failed:', err)
  await disconnectDatabase()
  process.exit(1)
})
