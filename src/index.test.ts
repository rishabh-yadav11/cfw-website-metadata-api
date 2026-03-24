import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from './index'

describe('Metadata API Integration', () => {
  let mockKV: any

  beforeEach(() => {
    mockKV = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined)
    }

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <html>
          <head>
            <title>Example Title</title>
            <meta name="description" content="Example Description" />
            <meta property="og:title" content="OG Example Title" />
            <link rel="canonical" href="https://example.com/canonical" />
          </head>
          <body>Hello World</body>
        </html>
      `
    }))
  })

  it('happy_path: GET /v1/metadata?url=https://example.com returns title, description, og, canonical', async () => {
    const res = await app.request('/v1/metadata?url=https://example.com', {
      headers: {
        'Authorization': 'Bearer test-token',
        'CF-Connecting-IP': '1.2.3.4'
      }
    }, {
      API_TOKEN: 'test-token',
      RATE_LIMIT_KV: mockKV
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({
      title: 'Example Title',
      description: 'Example Description',
      og: { title: 'OG Example Title' },
      canonical: 'https://example.com/canonical'
    })

    expect(fetch).toHaveBeenCalledWith('https://example.com', expect.any(Object))
  })

  it('handles alternative meta and link tags', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <html>
          <head>
            <meta content="Example Description Alt" name="description" />
            <link href="https://example.com/canonical-alt" rel="canonical" />
          </head>
          <body>Hello World</body>
        </html>
      `
    }))

    const res = await app.request('/v1/metadata?url=https://example.com', {
      headers: { 'Authorization': 'Bearer test-token' }
    }, { API_TOKEN: 'test-token', RATE_LIMIT_KV: mockKV })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({
      title: null,
      description: 'Example Description Alt',
      og: {},
      canonical: 'https://example.com/canonical-alt'
    })
  })

  it('blocked_target: GET with url=http://127.0.0.1 returns 400', async () => {
    const res = await app.request('/v1/metadata?url=http://127.0.0.1', {
      headers: {
        'Authorization': 'Bearer test-token',
        'CF-Connecting-IP': '1.2.3.4'
      }
    }, {
      API_TOKEN: 'test-token',
      RATE_LIMIT_KV: mockKV
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toEqual({ error: 'Invalid or blocked target URL' })

    expect(fetch).not.toHaveBeenCalled()
  })

  it('rate_limit: burst over limit returns 429', async () => {
    mockKV.get.mockResolvedValueOnce('10')

    const res = await app.request('/v1/metadata?url=https://example.com', {
      headers: {
        'Authorization': 'Bearer test-token',
        'CF-Connecting-IP': '1.2.3.4'
      }
    }, {
      API_TOKEN: 'test-token',
      RATE_LIMIT_KV: mockKV
    })

    expect(res.status).toBe(429)
    expect(await res.text()).toBe('Too Many Requests')
    expect(mockKV.put).not.toHaveBeenCalled()
  })

  it('returns 400 if url query param is missing', async () => {
    const res = await app.request('/v1/metadata', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    }, {
      API_TOKEN: 'test-token',
      RATE_LIMIT_KV: mockKV
    })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Missing url query parameter' })
  })

  it('returns 502 if fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    }))

    const res = await app.request('/v1/metadata?url=https://example.com', {
      headers: { 'Authorization': 'Bearer test-token' }
    }, {
      API_TOKEN: 'test-token',
      RATE_LIMIT_KV: mockKV
    })

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'Failed to fetch target URL: 404' })
  })

  it('returns 500 if fetch throws error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    const res = await app.request('/v1/metadata?url=https://example.com', {
      headers: { 'Authorization': 'Bearer test-token' }
    }, {
      API_TOKEN: 'test-token',
      RATE_LIMIT_KV: mockKV
    })

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Failed to process request' })
  })
})
