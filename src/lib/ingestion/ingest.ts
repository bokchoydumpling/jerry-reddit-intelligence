/**
 * Ingestion entry point — swap this file's data source for Apify without
 * touching the rest of the codebase.
 */
import { createClient } from '@supabase/supabase-js'
import { fetchNewPosts, fetchHotPosts, fetchPostComments } from './reddit-fetcher'
import { matchKeywords } from './keyword-matcher'
import type { IngestResult } from './types'

const SUBREDDITS = [
  'insurance',
  'personalfinance',
  'cars',
  'carinsurance',
  'frugal',
  'Frugal',
  'askcars',
  'AskCarGuys',
]

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function ingest(
  subreddits: string[] = SUBREDDITS,
  userId: string
): Promise<IngestResult> {
  const supabase = serviceClient()
  const result: IngestResult = { fetched: 0, inserted: 0, skipped: 0, errors: [] }

  // Load active keywords for the user
  const { data: keywords, error: kwErr } = await supabase
    .from('keywords')
    .select('id, term, is_brand')
    .eq('user_id', userId)
    .eq('active', true)

  if (kwErr || !keywords?.length) {
    result.errors.push('No active keywords found. Add keywords in Settings.')
    return result
  }

  for (const subreddit of subreddits) {
    try {
      const [newPosts, hotPosts] = await Promise.all([
        fetchNewPosts(subreddit, 25).catch(() => []),
        fetchHotPosts(subreddit, 10).catch(() => []),
      ])

      const seen = new Set<string>()
      const posts = [...newPosts, ...hotPosts].filter((p) => {
        if (seen.has(p.id)) return false
        seen.add(p.id)
        return true
      })

      for (const post of posts) {
        result.fetched++
        const fullText = `${post.title} ${post.selftext}`
        const matchedKw = matchKeywords(fullText, keywords)
        if (!matchedKw) continue

        // Upsert thread
        await supabase.from('reddit_threads').upsert({
          reddit_id: post.id,
          subreddit: post.subreddit,
          title: post.title,
          url: `https://www.reddit.com${post.permalink}`,
          author_username: post.author,
          score: post.score,
          num_comments: post.num_comments,
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'reddit_id', ignoreDuplicates: false })

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
            url: `https://www.reddit.com${post.permalink}`,
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

        // Fetch top comments for keyword matches
        if (post.num_comments > 0) {
          const comments = await fetchPostComments(post.subreddit, post.id, 10).catch(() => [])
          for (const comment of comments) {
            if (!matchKeywords(comment.body, keywords)) continue
            result.fetched++

            const { data: existingComment } = await supabase
              .from('reddit_mentions')
              .select('id')
              .eq('reddit_id', comment.id)
              .single()

            if (existingComment) {
              result.skipped++
            } else {
              const { error: ce } = await supabase.from('reddit_mentions').insert({
                reddit_id: comment.id,
                user_id: userId,
                keyword_id: matchedKw.id,
                subreddit: subreddit,
                body: comment.body,
                url: `https://www.reddit.com/r/${subreddit}/comments/${post.id}/`,
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

      // Polite delay between subreddits
      await new Promise((r) => setTimeout(r, 800))
    } catch (err) {
      result.errors.push(`r/${subreddit}: ${(err as Error).message}`)
    }
  }

  return result
}
