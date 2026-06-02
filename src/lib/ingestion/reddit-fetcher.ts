import type { RedditPost, RedditComment } from './types'

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Jerry-Intelligence/1.0)',
  Accept: 'application/json',
}

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: BASE_HEADERS,
    next: { revalidate: 0 },
  })

  if (!res.ok) throw new Error(`Reddit fetch failed: ${res.status} ${url}`)
  return res.json()
}

export async function fetchNewPosts(subreddit: string, limit = 25): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}&raw_json=1`
  const data = await fetchJSON(url) as { data: { children: { data: RedditPost }[] } }
  return data.data.children.map((c) => c.data)
}

export async function fetchHotPosts(subreddit: string, limit = 25): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}&raw_json=1`
  const data = await fetchJSON(url) as { data: { children: { data: RedditPost }[] } }
  return data.data.children.map((c) => c.data)
}

export async function fetchPostComments(subreddit: string, postId: string, limit = 20): Promise<RedditComment[]> {
  const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=${limit}&raw_json=1`
  const data = await fetchJSON(url) as [unknown, { data: { children: { data: RedditComment }[] } }]
  const commentListing = data[1]
  return commentListing.data.children
    .map((c) => c.data)
    .filter((c) => c.body && c.body !== '[deleted]' && c.body !== '[removed]')
}

export async function searchReddit(query: string, subreddit?: string, limit = 25): Promise<RedditPost[]> {
  const sr = subreddit ? `+site:reddit.com/r/${subreddit}` : ''
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query + sr)}&limit=${limit}&sort=new&raw_json=1`
  const data = await fetchJSON(url) as { data: { children: { data: RedditPost }[] } }
  return data.data.children.map((c) => c.data)
}
