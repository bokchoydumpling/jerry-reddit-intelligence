import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { MentionAnalysis } from '@/lib/ai/analyze'

export async function POST(request: NextRequest) {
  const { mention_id, analysis }: { mention_id: string; analysis: MentionAnalysis } = await request.json()

  const serviceClient = await createServiceClient()

  // Dedup — don't send the same mention twice
  const { data: existing } = await serviceClient
    .from('alerts')
    .select('id')
    .eq('mention_id', mention_id)
    .eq('channel', 'slack')
    .single()

  if (existing) return NextResponse.json({ skipped: true })

  const { data: mention } = await serviceClient
    .from('reddit_mentions')
    .select('title, body, url, subreddit')
    .eq('id', mention_id)
    .single()

  if (!mention) return NextResponse.json({ error: 'Mention not found' }, { status: 404 })

  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!slackWebhookUrl) return NextResponse.json({ error: 'No Slack webhook configured' }, { status: 500 })

  const priorityEmoji = analysis.priority_score >= 90 ? '🚨' : analysis.priority_score >= 80 ? '⚠️' : '📌'
  const sentimentEmoji = analysis.sentiment === 'positive' ? '✅' : analysis.sentiment === 'negative' ? '❌' : '➖'

  const payload = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${priorityEmoji} Jerry Reddit Alert — Priority ${analysis.priority_score}/100`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Subreddit:*\nr/${mention.subreddit}` },
          { type: 'mrkdwn', text: `*Sentiment:*\n${sentimentEmoji} ${analysis.sentiment}` },
          { type: 'mrkdwn', text: `*Intent:*\n${analysis.intent}` },
          { type: 'mrkdwn', text: `*Urgency:*\n${'🔴'.repeat(Math.min(analysis.urgency, 5))} ${analysis.urgency}/5` },
          { type: 'mrkdwn', text: `*Action:*\n${analysis.recommended_action.toUpperCase()}` },
          { type: 'mrkdwn', text: `*Team:*\n${analysis.team_owner}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*"${(mention.title || mention.body).slice(0, 200)}${(mention.title || mention.body).length > 200 ? '…' : ''}"*`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View on Reddit' },
            url: mention.url,
            style: 'primary',
          },
        ],
      },
    ],
  }

  const slackRes = await fetch(slackWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!slackRes.ok) {
    return NextResponse.json({ error: 'Slack send failed' }, { status: 500 })
  }

  await serviceClient.from('alerts').insert({
    mention_id,
    type: analysis.urgency >= 4 ? 'high_priority' : 'high_priority',
    channel: 'slack',
    payload,
  })

  return NextResponse.json({ sent: true })
}
