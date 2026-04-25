import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Performance monitoring wrapper
const createPrismaClient = () => {
  // Add pgbouncer=true to DATABASE_URL if not present for better pooling compatibility
  let databaseUrl = process.env.DATABASE_URL || ''
  if (databaseUrl.includes('pooler.supabase.com') && !databaseUrl.includes('pgbouncer=true')) {
    const separator = databaseUrl.includes('?') ? '&' : '?'
    databaseUrl = `${databaseUrl}${separator}pgbouncer=true`
  }

  // Connection pool settings for Supabase + Vercel serverless:
  // - connection_limit=1 is CRITICAL for pgbouncer transaction mode on serverless.
  //   Prisma should not maintain its own pool on top of pgbouncer — pgbouncer handles
  //   the real pooling server-side. Using >1 here causes multiple cold-start TCP
  //   connections on every new Vercel function instance.
  // - pool_timeout: max seconds to wait for a connection from the pool
  // - connect_timeout: max seconds to establish a new TCP connection
  const isTest = process.env.NODE_ENV === 'test'
  if (!databaseUrl.includes('connection_limit')) {
    const separator = databaseUrl.includes('?') ? '&' : '?'
    // 1 for serverless prod/staging, small pool only for local test runner
    const connectionLimit = isTest ? 3 : 1
    databaseUrl = `${databaseUrl}${separator}connection_limit=${connectionLimit}&pool_timeout=10&connect_timeout=10`
  }

  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
    ],
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  })

  // Only log critical slow queries (>1000ms) in production
  client.$on('query', (e: Prisma.QueryEvent) => {
    const duration = e.duration

    if (duration > 1000) {
      console.error(`🚨 CRITICAL SLOW QUERY (${duration}ms):`, {
        query: e.query.substring(0, 200),
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      })
    }
  })

  client.$on('error', (e: Prisma.LogEvent) => {
    console.error('🚨 DATABASE ERROR:', e)
  })

  return client
}

// Force disconnect method for tests
export const forceDisconnect = async () => {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect()
    globalForPrisma.prisma = undefined
  }
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

// Always cache in globalThis — in production this prevents spinning up a new
// PrismaClient on every warm Vercel function re-use (which would open new TCP
// connections to pgbouncer each time). Safe in serverless because the global
// is scoped to the Lambda worker instance, not shared across requests.
globalForPrisma.prisma = db