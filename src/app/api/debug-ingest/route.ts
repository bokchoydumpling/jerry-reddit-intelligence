import { NextResponse } from 'next/server'

// Temporary diagnostic endpoint — no auth required, DELETE after debug
export async function GET() {
  const results: Record<string, unknown> = {}

  const terms = ['jerry insurance', 'getjerry', '"jerry app"']
  for (const term of terms) {
    try {
      const res = await fetch(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(term)}&sort=new&limit=5&raw_json=1`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'application/json',
          },
          cache: 'no-store',
        }
      )
      const text = await res.text()
      const isJSON = text.trimStart().startsWith('{')
      if (isJSON) {
        const d = JSON.parse(text)
        const posts = d.data?.children ?? []
        results[term] = {
          status: res.status,
          ok: true,
          count: posts.length,
          posts: posts.slice(0, 3).map((p: { data: { subreddit: string; title: string; url: string } }) => ({
            subreddit: p.data.subreddit,
            title: p.data.title.slice(0, 80),
            url: p.data.url,
          })),
        }
      } else {
        results[term] = { status: res.status, ok: false, body: text.slice(0, 100) }
      }
    } catch (e) {
      results[term] = { ok: false, error: (e as Error).message }
    }
  }

  return NextResponse.json(results)
}
