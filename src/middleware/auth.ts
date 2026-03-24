import type { MiddlewareHandler } from 'hono'

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const expectedToken = c.env?.API_TOKEN

  if (!expectedToken) {
    // If no token configured, fail closed
    return c.text('Unauthorized', 401)
  }

  if (token !== expectedToken) {
    return c.text('Unauthorized', 401)
  }

  await next()
}
