/**
 * Reddit data source — Apify macheta/super-fast-reddit-scraper.
 * Swap this file (and only this file) to change the data source.
 *
 * Actor docs: runs from subreddit or post URLs; does NOT support search URLs.
 * We batch all subreddit URLs into a single actor run to minimise credit use.
 */
import { ApifyClient } from 'apify-client'
import type { RedditPost } from './types'

const client = new ApifyClient({ token: process.env.APIFY_API_KEY })
const ACTOR_ID = 'macheta/super-fast-reddit-scraper'

interface ActorItem {
  type?: string
  id?: string
  subreddit?: string
  title?: string
  author?: string
  created_utc?: number
  score?: number
  num_comments?: number
  url?: string
  selftext?: string
  permalink?: string
  body?: string            // comments use this field
  is_self?: boolean
}

/** Fetch recent posts from a batch of subreddits in one actor invocation. */
export async function fetchSubreddits(
  subreddits: string[],
  maxItemsTotal = 300
): Promise<RedditPost[]> {
  const startUrls = subreddits.map((sr) => ({
    url: `https://www.reddit.com/r/${sr}/new/`,
  }))

  const run = await client.actor(ACTOR_ID).call(
    { startUrls, maxItems: maxItemsTotal },
    { waitSecs: 180 }
  )

  const { items } = await client.dataset(run.defaultDatasetId).listItems()

  return (items as ActorItem[])
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

// Legacy single-subreddit helpers used by ingest.ts — delegate to batch call
export async function fetchNewPosts(subreddit: string, limit = 25): Promise<RedditPost[]> {
  return fetchSubreddits([subreddit], limit)
}

export async function fetchHotPosts(subreddit: string, limit = 25): Promise<RedditPost[]> {
  return fetchSubreddits([subreddit], limit)
}

/**
 * Fetch comments for a specific post via Reddit's public JSON endpoint.
 * Falls back gracefully if Reddit blocks the IP.
 */
export async function fetchPostComments(
  subreddit: string,
  postId: string,
  limit = 20
): Promise<{ id: string; body: string; author: string; score: number; created_utc: number; subreddit: string }[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=${limit}&raw_json=1`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    const text = await res.text()
    if (!text.trimStart().startsWith('[')) return []

    const data = JSON.parse(text) as [unknown, { data: { children: { data: { id: string; body: string; author: string; score: number; created_utc: number } }[] } }]
    return data[1].data.children
      .map((c) => c.data)
      .filter((c) => c.body && c.body !== '[deleted]' && c.body !== '[removed]')
      .map((c) => ({ ...c, subreddit }))
  } catch {
    return []
  }
}
