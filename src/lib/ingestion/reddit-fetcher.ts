import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: process.env.APIFY_API_KEY });

const ACTOR_ID = 'trudax/reddit-scraper';

interface ApifyItem {
  id?: string;
  title?: string;
  selftext?: string;
  body?: string;
  author?: string;
  subreddit?: string;
  url?: string;
  permalink?: string;
  score?: number;
  num_comments?: number;
  created_utc?: number;
  upvote_ratio?: number;
  link_flair_text?: string;
}

async function runActor(input: Record<string, unknown>) {
  const run = await client.actor(ACTOR_ID).call(input);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return items as ApifyItem[];
}

function normalize(items: ApifyItem[]) {
  return items
    .filter(i => i.title)
    .map(i => ({
      id: i.id ?? crypto.randomUUID(),
      title: i.title ?? '',
      selftext: i.selftext ?? i.body ?? '',
      author: i.author ?? '[deleted]',
      subreddit: i.subreddit ?? '',
      url: i.url ?? `https://reddit.com${i.permalink ?? ''}`,
      permalink: i.permalink ?? '',
      score: i.score ?? 0,
      num_comments: i.num_comments ?? 0,
      created_utc: i.created_utc ?? Date.now() / 1000,
      upvote_ratio: i.upvote_ratio,
      link_flair_text: i.link_flair_text,
    }));
}

export async function fetchNewPosts(subreddit: string, limit = 25) {
  const items = await runActor({
    startUrls: [{ url: `https://www.reddit.com/r/${subreddit}/new/` }],
    maxItems: limit,
    proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
  });
  return normalize(items);
}

export async function fetchHotPosts(subreddit: string, limit = 25) {
  const items = await runActor({
    startUrls: [{ url: `https://www.reddit.com/r/${subreddit}/hot/` }],
    maxItems: limit,
    proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
  });
  return normalize(items);
}

export async function fetchPostComments(subreddit: string, postId: string, limit = 20) {
  const items = await runActor({
    startUrls: [{ url: `https://www.reddit.com/r/${subreddit}/comments/${postId}/` }],
    maxItems: limit,
    proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
  });
  return items
    .filter(i => i.body && i.body !== '[deleted]' && i.body !== '[removed]')
    .map(i => ({
      id: i.id ?? crypto.randomUUID(),
      body: i.body ?? '',
      author: i.author ?? '[deleted]',
      score: i.score ?? 0,
      created_utc: i.created_utc ?? Date.now() / 1000,
    }));
}

export async function searchReddit(query: string, subreddit?: string, limit = 25) {
  const sr = subreddit ? `+site:reddit.com/r/${subreddit}` : '';
  const items = await runActor({
    searches: [{ term: query + sr, sort: 'new' }],
    maxItems: limit,
    proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
  });
  return normalize(items);
}
