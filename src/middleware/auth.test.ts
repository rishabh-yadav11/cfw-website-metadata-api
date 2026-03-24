import { describe, it, expect, vi } from 'vitest'
import { authMiddleware } from './auth'
import type { Context } from 'hono'

describe('authMiddleware', () => {
  it('returns 401 if no expected token is configured', async () => {
    const c = {
      req: { header: () => 'Bearer sometoken' },
      env: {},
      text: vi.fn((text, status) => ({ text, status }))
    } as unknown as Context

    const next = vi.fn()

    const result = await authMiddleware(c, next)

    expect(c.text).toHaveBeenCalledWith('Unauthorized', 401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 if token is incorrect', async () => {
    const c = {
      req: { header: () => 'Bearer wrongtoken' },
      env: { API_TOKEN: 'righttoken' },
      text: vi.fn((text, status) => ({ text, status }))
    } as unknown as Context

    const next = vi.fn()

    const result = await authMiddleware(c, next)

    expect(c.text).toHaveBeenCalledWith('Unauthorized', 401)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next if token is correct', async () => {
    const c = {
      req: { header: () => 'Bearer righttoken' },
      env: { API_TOKEN: 'righttoken' },
      text: vi.fn()
    } as unknown as Context

    const next = vi.fn()

    await authMiddleware(c, next)

    expect(c.text).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })
})
