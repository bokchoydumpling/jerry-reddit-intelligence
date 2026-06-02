/**
 * Ingestion entry point.
 * Strategy: one Apify actor run across all target subreddits, then keyword-match client-side.
 * Comment fetching uses Reddit public JSON as a best-effort supplement.
 */
import { createClient } from '@supabase/supabase-js'
import { fetchSubreddits, fetchPostComments } from './reddit-fetcher'
import { matchKeywords } from './keyword-matcher'
import type { IngestResult } from './types'

const TARGET_SUBREDDITS = [
  'insurance',
  'carinsurance',
  'personalfinance',
  'cars',
  'askcars',
  'frugal',
  'legaladvice',
  'mildlyinfuriating',
  'povertyfinance',
  'AutoInsurance',
]

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function ingest(
  subreddits: string[] = TARGET_SUBREDDITS,
  userId: string
): Promise<IngestResult> {
  const supabase = serviceClient()
  const result: IngestResult = { fetched: 0, inserted: 0, skipped: 0, errors: [] }

  const { data: keywords, error: kwErr } = await supabase
    .from('keywords')
    .select('id, term, is_brand')
    .eq('user_id', userId)
    .eq('active', true)

  if (kwErr || !keywords?.length) {
    result.errors.push('No active keywords found. Add keywords in Settings first.')
    return result
  }

  // One batched Apify run across all subreddits
  let posts
  try {
    posts = await fetchSubreddits(subreddits, subreddits.length * 30)
    result.fetched = posts.length
    result.errors.push(`[apify] fetched ${posts.length} posts across ${subreddits.length} subreddits`)
  } catch (err) {
    result.errors.push(`[apify] run failed: ${(err as Error).message.slice(0, 200)}`)
    return result
  }

  for (const post of posts) {
    const fullText = `${post.title} ${post.selftext}`
    const matchedKw = matchKeywords(fullText, keywords)
    if (!matchedKw) continue

    // Upsert thread
    await supabase.from('reddit_threads').upsert(
      {
        reddit_id: post.id,
        subreddit: post.subreddit,
        title: post.title,
        url: post.url || `https://www.reddit.com${post.permalink}`,
        author_username: post.author,
        score: post.score,
        num_comments: post.num_comments,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'reddit_id', ignoreDuplicates: false }
    )

    const { data: existing } = await supabase
      .from('reddit_mentions')
      .select('id')
      .eq('reddit_id', post.id)
      .single()

    if (existing) {
      result.skipped++
    } else {
      const { error } = await supabase.from('reddit_mentions').insert({
        reddit_id: post.id,
        user_id: userId,
        keyword_id: matchedKw.id,
        subreddit: post.subreddit,
        title: post.title,
        body: post.selftext || post.title,
        url: post.url || `https://www.reddit.com${post.permalink}`,
        score: post.score,
        is_post: true,
        created_at: new Date(post.created_utc * 1000).toISOString(),
      })
      if (error) {
        result.errors.push(`Post ${post.id}: ${error.message}`)
      } else {
        result.inserted++
      }
    }

    // Best-effort comment scan via public JSON
    if (post.num_comments > 0 && post.subreddit && post.id) {
      const comments = await fetchPostComments(post.subreddit, post.id, 10)
      for (const comment of comments) {
        if (!matchKeywords(comment.body, keywords)) continue
        result.fetched++

        const { data: existingC } = await supabase
          .from('reddit_mentions')
          .select('id')
          .eq('reddit_id', comment.id)
          .single()

        if (existingC) {
          result.skipped++
        } else {
          const { error: ce } = await supabase.from('reddit_mentions').insert({
            reddit_id: comment.id,
            user_id: userId,
            keyword_id: matchedKw.id,
            subreddit: post.subreddit,
            body: comment.body,
            url: `https://www.reddit.com/r/${post.subreddit}/comments/${post.id}/`,
            score: comment.score,
            is_post: false,
            created_at: new Date(comment.created_utc * 1000).toISOString(),
          })
          if (ce) {
            result.errors.push(`Comment ${comment.id}: ${ce.message}`)
          } else {
            result.inserted++
          }
        }
      }
    }
  }

  return result
}
