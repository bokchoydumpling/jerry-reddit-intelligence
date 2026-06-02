import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { analyzeMention, generateResponse } from '@/lib/ai/analyze'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = await createServiceClient()

  // Get all mention IDs for this user
  const { data: allMentions } = await serviceClient
    .from('reddit_mentions')
    .select('id')
    .eq('user_id', user.id)

  const allIds = allMentions?.map((m) => m.id) ?? []
  if (!allIds.length) return NextResponse.json({ message: 'No mentions', processed: 0 })

  // Get already-analyzed mention IDs
  const { data: analyzed } = await serviceClient
    .from('analyses')
    .select('mention_id')
    .in('mention_id', allIds)

  const analyzedIds = new Set((analyzed ?? []).map((a) => a.mention_id))
  const unanalyzedIds = allIds.filter((id) => !analyzedIds.has(id))

  if (!unanalyzedIds.length) return NextResponse.json({ message: 'All mentions analyzed', processed: 0 })

  // Fetch unanalyzed mention details (batch of 20)
  const { data: mentions, error } = await serviceClient
    .from('reddit_mentions')
    .select('id, body, title, subreddit, score, url')
    .in('id', unanalyzedIds.slice(0, 20))
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!mentions?.length) return NextResponse.json({ message: 'No unanalyzed mentions', processed: 0 })

  let processed = 0
  let errors = 0

  for (const mention of mentions) {
    try {
      const text = mention.title ? `${mention.title}\n\n${mention.body}` : mention.body
      const analysis = await analyzeMention(text, mention.subreddit, mention.score)

      const { data: analysisRow, error: ae } = await serviceClient
        .from('analyses')
        .insert({
          mention_id: mention.id,
          ...analysis,
          raw_output: analysis,
          model_used: 'claude-haiku-4-5',
        })
        .select('id')
        .single()

      if (ae) throw new Error(ae.message)

      if (analysis.recommended_action === 'respond' || analysis.recommended_action === 'escalate') {
        const responseText = await generateResponse(text, analysis, mention.subreddit)
        await serviceClient.from('response_suggestions').insert({
          mention_id: mention.id,
          analysis_id: analysisRow.id,
          body: responseText,
          tone: 'professional',
          model_used: 'claude-sonnet-4-6',
        })
      }

      // Fire Slack alert for high priority
      if (analysis.priority_score >= 80 || analysis.urgency >= 4) {
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          ? process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000'
          : 'http://localhost:3000'

        await fetch(`${baseUrl}/api/alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mention_id: mention.id, analysis }),
        }).catch(() => null)
      }

      processed++
    } catch {
      errors++
    }
  }

  return NextResponse.json({ processed, errors, total: mentions.length })
}
