import app from './app.js'
import env from './config/env.js'
import { connectDatabase, disconnectDatabase } from './config/db.js'

async function start() {
  try {
    await connectDatabase()
  } catch (err) {
    console.error('[db] connection failed:', err.message)
    console.error('     Check MONGODB_URI in backend/.env and that MongoDB is reachable.')
    process.exit(1)
  }

  const server = app.listen(env.port, () => {
    console.log(`[api] MediAssist backend listening on http://localhost:${env.port}`)
    console.log(`[api] environment: ${env.nodeEnv}`)
    console.log(
      `[api] RAG service: ${env.ragServiceUrl || 'not configured (offline fallback active)'}`,
    )
  })

  const shutdown = async (signal) => {
    console.log(`\n[api] ${signal} received — shutting down`)
    server.close(async () => {
      await disconnectDatabase()
      process.exit(0)
    })
    // Do not hang forever if a connection refuses to drain.
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('unhandledRejection', (reason) => {
    console.error('[api] unhandled rejection:', reason)
  })
}

start()
