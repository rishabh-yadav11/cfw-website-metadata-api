import { Hono } from 'hono'
import { isUrlAllowed } from './utils/ssrf'
import { authMiddleware } from './middleware/auth'
import { rateLimitMiddleware } from './middleware/rateLimit'

interface Env {
  API_TOKEN: string
  RATE_LIMIT_KV: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

// Global middlewares for baseline security
app.use('*', authMiddleware)
app.use('*', rateLimitMiddleware)

app.get('/v1/metadata', async (c) => {
  const urlParam = c.req.query('url')

  if (!urlParam) {
    return c.json({ error: 'Missing url query parameter' }, 400)
  }

  // SSRF Protection
  if (!isUrlAllowed(urlParam)) {
    return c.json({ error: 'Invalid or blocked target URL' }, 400)
  }

  try {
    const res = await fetch(urlParam, {
      headers: {
        'User-Agent': 'WebsiteMetadataAPI/1.0',
        'Accept': 'text/html'
      }
    })

    if (!res.ok) {
      return c.json({ error: `Failed to fetch target URL: ${res.status}` }, 502)
    }

    const html = await res.text()

    // Simplified parsing for tests
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1] : null

    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
                      html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)
    const description = descMatch ? descMatch[1] : null

    const ogMatch = html.match(/<meta[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    const og = ogMatch ? { [ogMatch[1]]: ogMatch[2] } : {}

    const canonMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i) ||
                       html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["'][^>]*>/i)
    const canonical = canonMatch ? canonMatch[1] : null

    return c.json({
      title,
      description,
      og,
      canonical
    })

  } catch (err) {
    return c.json({ error: 'Failed to process request' }, 500)
  }
})

export default app
