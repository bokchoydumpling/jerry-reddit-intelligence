'use client'

import { useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'

interface MentionData {
  id: string
  subreddit: string
  title: string | null
  body: string
  url: string
  created_at: string
}

interface TrustItem {
  mention_id: string
  urgency: number
  priority_score: number
  sentiment: string
  response_suggestions: { body: string; tone: string; is_active: boolean } | { body: string; tone: string; is_active: boolean }[] | null
  reddit_mentions: MentionData | MentionData[]
}

function getMention(m: MentionData | MentionData[]): MentionData {
  return Array.isArray(m) ? m[0] : m
}

function getSuggestion(s: TrustItem['response_suggestions']) {
  if (!s) return null
  return Array.isArray(s) ? s.find((r) => r.is_active) ?? s[0] : s
}

export default function TrustTracker({ items }: { items: TrustItem[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-[#111927] border border-[#1e2d42] rounded-xl">
        <p className="text-[#475569] text-sm">No trust questions detected yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const suggestion = getSuggestion(item.response_suggestions)
        const isExpanded = expanded === item.mention_id
        const mention = getMention(item.reddit_mentions)

        return (
          <div key={item.mention_id} className="bg-[#111927] border border-[#1e2d42] rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(isExpanded ? null : item.mention_id)}
              className="w-full text-left p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 bg-[#FB3D78]/10 text-[#FB3D78] rounded font-semibold">
                  Trust Question
                </span>
                <span className="text-xs text-[#64748b]">r/{mention.subreddit}</span>
                <span className="text-xs text-[#475569]">·</span>
                <span className="text-xs text-[#64748b]">
                  {formatDistanceToNow(parseISO(mention.created_at), { addSuffix: true })}
                </span>
                <span
                  className="ml-auto text-sm font-bold tabular-nums"
                  style={{ color: item.urgency >= 4 ? '#f43f5e' : '#f59e0b' }}
                >
                  Urgency {item.urgency}/5
                </span>
              </div>
              <p className="text-sm text-[#FEFEFE]">
                {mention.title ?? mention.body.slice(0, 150)}
              </p>
              {mention.title && (
                <p className="text-xs text-[#64748b] mt-1 line-clamp-2">{mention.body}</p>
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-[#1e2d42] p-4">
                <div className="flex gap-3 mb-4">
                  <a href={mention.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#1e2d42] text-[#64748b] hover:text-[#FEFEFE] hover:border-[#2a3d55] transition-colors">
                    View on Reddit ↗
                  </a>
                </div>

                {suggestion ? (
                  <div className="bg-[#141D2C] border border-[#1e2d42] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#64748b]">Suggested response · {suggestion.tone}</span>
                      <button
                        onClick={() => copy(item.mention_id, suggestion.body)}
                        className="text-xs px-3 py-1 rounded-lg bg-[#FB3D78] text-white font-medium hover:bg-[#f91f63] transition-colors"
                      >
                        {copied === item.mention_id ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-sm text-[#FEFEFE] leading-relaxed">{suggestion.body}</p>
                  </div>
                ) : (
                  <p className="text-xs text-[#475569]">No response suggestion generated yet.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
