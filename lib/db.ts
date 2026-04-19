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

  // Add connection pool limits for Supabase
  // connection_limit: max connections in the pool (higher for Supabase pooled connections)
  // pool_timeout: max seconds to wait for a connection
  // connect_timeout: max seconds to establish a new connection
  if (!databaseUrl.includes('connection_limit')) {
    const separator = databaseUrl.includes('?') ? '&' : '?'
    databaseUrl = `${databaseUrl}${separator}connection_limit=8&pool_timeout=20&connect_timeout=10`
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

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db