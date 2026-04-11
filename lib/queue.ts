// BullMQ queues have been removed.
// All email delivery is handled directly via Resend (lib/resend.ts).
// All scheduling is handled by Vercel Cron (vercel.json + app/api/cron/).
// Redis is still used by CacheService in lib/redis.ts.
