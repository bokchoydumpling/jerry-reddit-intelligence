'use client'

import { useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'

interface ResponseSuggestion {
  id: string
  body: string
  tone: string
  version: number
  is_active: boolean
}

interface MentionData {
  id: string
  subreddit: string
  title: string | null
  body: string
  url: string
  created_at: string
}

interface QueueItem {
  mention_id: string
  priority_score: number
  sentiment: string
  intent: string
  urgency: number
  recommended_action: string
  team_owner: string
  response_suggestions: ResponseSuggestion | ResponseSuggestion[] | null
  reddit_mentions: MentionData | MentionData[]
}

function getSuggestion(s: ResponseSuggestion | ResponseSuggestion[] | null): ResponseSuggestion | null {
  if (!s) return null
  return Array.isArray(s) ? s.find((r) => r.is_active) ?? s[0] : s
}

function getMention(m: MentionData | MentionData[]): MentionData {
  return Array.isArray(m) ? m[0] : m
}

export default function ResponseQueue({ items }: { items: QueueItem[] }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  async function copyResponse(id: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]))
    fetch('/api/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mention_id: id, status: 'dismissed' }),
    }).catch(() => null)
  }

  const visible = items.filter((i) => !dismissed.has(i.mention_id))

  if (visible.length === 0) {
    return (
      <div className="flex items-center justify-center h-60 bg-[#111927] border border-[#1e2d42] rounded-xl">
        <div className="text-center">
          <div className="text-2xl mb-2">✓</div>
          <p className="text-[#64748b] text-sm">Queue is clear. Good work.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {visible.map((item) => {
        const suggestion = getSuggestion(item.response_suggestions)
        const isEscalate = item.recommended_action === 'escalate'
        const mention = getMention(item.reddit_mentions)

        return (
          <div
            key={item.mention_id}
            className={`bg-[#111927] border rounded-xl p-5 ${isEscalate ? 'border-[#f43f5e]/40' : 'border-[#1e2d42]'}`}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${isEscalate ? 'bg-[#f43f5e]/10 text-[#f43f5e]' : 'bg-[#FB3D78]/10 text-[#FB3D78]'}`}>
                  {item.recommended_action.toUpperCase()}
                </span>
                <span className="text-xs text-[#64748b]">r/{mention.subreddit}</span>
                <span className="text-xs text-[#475569]">·</span>
                <span className="text-xs text-[#64748b]">{item.intent}</span>
                <span className="text-xs text-[#475569]">·</span>
                <span className="text-xs text-[#64748b]">urgency {item.urgency}/5</span>
                <span className="text-xs text-[#475569]">·</span>
                <span className="text-xs text-[#64748b]">owner: {item.team_owner}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: item.priority_score >= 80 ? '#f43f5e' : '#f59e0b' }}
                >
                  {item.priority_score}
                </span>
                <button
                  onClick={() => dismiss(item.mention_id)}
                  className="text-xs text-[#475569] hover:text-[#64748b] transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-[#FEFEFE] mb-1">{mention.title ?? ''}</p>
              <p className="text-xs text-[#94a3b8] line-clamp-3">{mention.body}</p>
              <a href={mention.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#FB3D78] hover:underline mt-1 inline-block">
                View on Reddit ↗
              </a>
            </div>

            {suggestion ? (
              <div className="bg-[#141D2C] border border-[#1e2d42] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#64748b]">Suggested response · {suggestion.tone}</span>
                  <button
                    onClick={() => copyResponse(suggestion.id, suggestion.body)}
                    className="text-xs px-3 py-1 rounded-lg bg-[#FB3D78] text-white font-medium hover:bg-[#f91f63] transition-colors"
                  >
                    {copied === suggestion.id ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-sm text-[#FEFEFE] leading-relaxed">{suggestion.body}</p>
              </div>
            ) : (
              <div className="bg-[#141D2C] border border-[#1e2d42] rounded-lg p-4 text-xs text-[#475569]">
                No response suggestion generated yet. Run analysis again.
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
