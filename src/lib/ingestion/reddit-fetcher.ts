/**
 * Reddit data source — hybrid approach:
 *  PRIMARY:   Reddit public search JSON (works from Vercel Lambda IPs)
 *  SECONDARY: Apify macheta actor for subreddit scanning (no IP restriction)
 *
 * Swap this file to change the data source without touching the rest of the app.
 */
import { ApifyClient } from 'apify-client'
import type { RedditPost, RedditComment } from './types'

// ─── Reddit public JSON helpers ───────────────────────────────────────────────

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function redditJSON(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    cache: 'no-store',
  })
  const text = await res.text()
  if (!text.trimStart().startsWith('{') && !text.trimStart().startsWith('[')) {
    throw new Error(`Reddit returned non-JSON (HTTP ${res.status}) — likely rate-limited`)
  }
  return JSON.parse(text)
}

type RedditListing = { data: { children: { data: RedditPost }[] } }

/**
 * Search Reddit globally for a query term.
 * Fast, targeted — finds brand mentions across all of Reddit.
 * Works from Vercel Lambda IPs (rotating); may 403 from static datacenter IPs.
 */
export async function searchReddit(
  query: string,
  sort: 'new' | 'relevance' = 'new',
  limit = 25
): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=${sort}&limit=${limit}&raw_json=1&type=link`
  const data = await redditJSON(url) as RedditListing
  return data.data.children.map((c) => c.data)
}

/**
 * Fetch comments for a specific post.
 * Best-effort — silently returns [] if blocked.
 */
export async function fetchPostComments(
  subreddit: string,
  postId: string,
  limit = 20
): Promise<RedditComment[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=${limit}&raw_json=1`
    const data = await redditJSON(url) as [unknown, { data: { children: { data: RedditComment }[] } }]
    return data[1].data.children
      .map((c) => c.data)
      .filter((c) => c.body && c.body !== '[deleted]' && c.body !== '[removed]')
  } catch {
    return []
  }
}

// ─── Apify subreddit scanner ──────────────────────────────────────────────────

const ACTOR_ID = 'macheta/super-fast-reddit-scraper'

function apifyClient() {
  return new ApifyClient({ token: process.env.APIFY_API_KEY })
}

interface ApifyItem {
  type?: string; id?: string; subreddit?: string; title?: string
  author?: string; created_utc?: number; score?: number; num_comments?: number
  url?: string; selftext?: string; permalink?: string; is_self?: boolean
}

/**
 * Scan a batch of subreddits via Apify (no IP restrictions, no search support).
 * Used as a supplement to catch mentions that search misses.
 */
export async function fetchSubreddits(
  subreddits: string[],
  maxItemsTotal = 300
): Promise<RedditPost[]> {
  const client = apifyClient()
  const startUrls = subreddits.map((sr) => ({
    url: `https://www.reddit.com/r/${sr}/new/`,
  }))

  const run = await client.actor(ACTOR_ID).call(
    { startUrls, maxItems: maxItemsTotal },
    { waitSecs: 240 }
  )
  const { items } = await client.dataset(run.defaultDatasetId).listItems()

  return (items as ApifyItem[])
    .filter((i) => i.type === 'post' && i.id)
    .map((i) => ({
      id: i.id!,
      name: `t3_${i.id}`,
      subreddit: i.subreddit ?? '',
      title: i.title ?? '',
      selftext: i.selftext ?? '',
      url: i.url ?? '',
      author: i.author ?? '[deleted]',
      score: i.score ?? 0,
      num_comments: i.num_comments ?? 0,
      created_utc: i.created_utc ?? Math.floor(Date.now() / 1000),
      permalink: i.permalink ?? '',
      is_self: i.is_self ?? true,
    }))
}

// Legacy helpers used by old code paths
export async function fetchNewPosts(subreddit: string, limit = 25): Promise<RedditPost[]> {
  return fetchSubreddits([subreddit], limit)
}

export async function fetchHotPosts(subreddit: string, limit = 25): Promise<RedditPost[]> {
  return fetchSubreddits([subreddit], limit)
}
