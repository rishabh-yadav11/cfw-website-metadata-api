import { describe, it, expect, vi } from 'vitest'
import { rateLimitMiddleware } from './rateLimit'
import type { Context } from 'hono'

describe('rateLimitMiddleware', () => {
  it('calls next if KV is not configured', async () => {
    const c = {
      req: { header: () => '1.2.3.4' },
      env: {},
      text: vi.fn()
    } as unknown as Context

    const next = vi.fn()

    await rateLimitMiddleware(c, next)

    expect(c.text).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it('allows request and increments count if under limit', async () => {
    const kv = {
      get: vi.fn().mockResolvedValue('5'),
      put: vi.fn().mockResolvedValue(undefined)
    }

    const c = {
      req: { header: () => '1.2.3.4' },
      env: { RATE_LIMIT_KV: kv },
      text: vi.fn()
    } as unknown as Context

    const next = vi.fn()

    await rateLimitMiddleware(c, next)

    expect(kv.get).toHaveBeenCalledWith('ratelimit:1.2.3.4')
    expect(kv.put).toHaveBeenCalledWith('ratelimit:1.2.3.4', '6', { expirationTtl: 60 })
    expect(c.text).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it('blocks request and returns 429 if at or over limit', async () => {
    const kv = {
      get: vi.fn().mockResolvedValue('10'),
      put: vi.fn()
    }

    const c = {
      req: { header: () => '1.2.3.4' },
      env: { RATE_LIMIT_KV: kv },
      text: vi.fn((text, status) => ({ text, status }))
    } as unknown as Context

    const next = vi.fn()

    await rateLimitMiddleware(c, next)

    expect(kv.get).toHaveBeenCalledWith('ratelimit:1.2.3.4')
    expect(kv.put).not.toHaveBeenCalled()
    expect(c.text).toHaveBeenCalledWith('Too Many Requests', 429)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next if KV throws an error', async () => {
    const kv = {
      get: vi.fn().mockRejectedValue(new Error('KV failure')),
      put: vi.fn()
    }

    const c = {
      req: { header: () => '1.2.3.4' },
      env: { RATE_LIMIT_KV: kv },
      text: vi.fn()
    } as unknown as Context

    const next = vi.fn()

    await rateLimitMiddleware(c, next)

    expect(kv.get).toHaveBeenCalledWith('ratelimit:1.2.3.4')
    expect(c.text).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })
})
