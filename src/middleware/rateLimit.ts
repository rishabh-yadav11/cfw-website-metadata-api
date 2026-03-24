import type { MiddlewareHandler } from 'hono'

interface Env {
  RATE_LIMIT_KV: KVNamespace
}

export const rateLimitMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  if (!c.env?.RATE_LIMIT_KV) {
    // If KV not configured, pass through (or fail closed, depending on requirements)
    await next()
    return
  }

  // Use IP or API token as rate limit key
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'
  const key = `ratelimit:${ip}`

  try {
    const data = await c.env.RATE_LIMIT_KV.get(key)
    let count = data ? parseInt(data, 10) : 0

    if (count >= 10) {
      // Return 429 Too Many Requests
      return c.text('Too Many Requests', 429)
    }

    // Increment and store with 60 second expiration
    count++
    await c.env.RATE_LIMIT_KV.put(key, count.toString(), { expirationTtl: 60 })

    await next()
  } catch (err) {
    // Log error but probably allow request on KV failure
    await next()
  }
}
