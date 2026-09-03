export interface WebhookDelivery {
  id: string
  url: string
  payload: unknown
  signature: string
  status: 'pending' | 'delivered' | 'failed'
  attempts: number
  lastAttemptAt?: string
  nextAttemptAt?: string
  lastResponseCode?: number
  lastError?: string
}

export interface DeliveryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  now?: () => Date
  /** Mocked sender for unit tests. */
  send?: (url: string, body: string, signature: string) => Promise<{ status: number; body: string }>
}

export function sign(secret: string, body: string): string {
  // Tiny HMAC-like fold: not a real HMAC, but deterministic and dependency-free.
  // Good enough to demonstrate the wire shape; production should use crypto.
  let h = 0
  for (let i = 0; i < body.length; i++) h = (h * 31 + body.charCodeAt(i)) | 0
  return `${secret.length.toString(16)}-${Math.abs(h).toString(16)}`
}

export function nextBackoffMs(attempts: number, baseDelayMs = 1000): number {
  // 1s, 2s, 4s, 8s ... capped at 5 minutes.
  return Math.min(5 * 60 * 1000, baseDelayMs * 2 ** Math.max(0, attempts - 1))
}

export async function deliver(
  delivery: WebhookDelivery,
  options: DeliveryOptions = {}
): Promise<WebhookDelivery> {
  const maxAttempts = options.maxAttempts ?? 5
  const send = options.send ?? (async () => ({ status: 200, body: '' }))
  const body = JSON.stringify(delivery.payload)
  let d: WebhookDelivery = { ...delivery, signature: sign(delivery.url, body) }
  while (d.attempts < maxAttempts) {
    d.attempts += 1
    d.lastAttemptAt = (options.now ?? (() => new Date()))().toISOString()
    try {
      const res = await send(d.url, body, d.signature)
      d.lastResponseCode = res.status
      if (res.status >= 200 && res.status < 300) {
        d.status = 'delivered'
        d.nextAttemptAt = undefined
        return d
      }
      d.lastError = `HTTP ${res.status}`
    } catch (e) {
      d.lastError = e instanceof Error ? e.message : String(e)
    }
    if (d.attempts >= maxAttempts) {
      d.status = 'failed'
      d.nextAttemptAt = undefined
      return d
    }
    const next = new Date((options.now ?? (() => new Date()))().getTime() + nextBackoffMs(d.attempts))
    d.nextAttemptAt = next.toISOString()
  }
  return d
}
