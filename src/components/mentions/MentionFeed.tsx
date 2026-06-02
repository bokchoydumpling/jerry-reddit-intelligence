'use client'

import { useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'

interface Analysis {
  sentiment: string
  intent: string
  urgency: number
  priority_score: number
  recommended_action: string
  trust_impact: string
  sarcasm: boolean
  team_owner: string
}

interface Mention {
  id: string
  subreddit: string
  title: string | null
  body: string
  url: string
  score: number
  is_post: boolean
  created_at: string
  analyses: Analysis | Analysis[] | null
}

const sentimentColor: Record<string, string> = {
  positive: '#10b981',
  negative: '#f43f5e',
  neutral: '#64748b',
  mixed: '#f59e0b',
}

const actionBadgeStyle: Record<string, string> = {
  respond: 'bg-[#FB3D78]/10 text-[#FB3D78]',
  escalate: 'bg-[#f43f5e]/10 text-[#f43f5e]',
  monitor: 'bg-[#f59e0b]/10 text-[#f59e0b]',
  ignore: 'bg-[#1e2d42] text-[#64748b]',
}

function getAnalysis(a: Analysis | Analysis[] | null): Analysis | null {
  if (!a) return null
  return Array.isArray(a) ? a[0] : a
}

export default function MentionFeed({ mentions }: { mentions: Mention[] }) {
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [intentFilter, setIntentFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [selected, setSelected] = useState<Mention | null>(null)

  const filtered = mentions.filter((m) => {
    const a = getAnalysis(m.analyses)
    if (sentimentFilter !== 'all' && a?.sentiment !== sentimentFilter) return false
    if (intentFilter !== 'all' && a?.intent !== intentFilter) return false
    if (actionFilter !== 'all' && a?.recommended_action !== actionFilter) return false
    return true
  })

  return (
    <div className="flex gap-6">
      {/* Main feed */}
      <div className="flex-1 min-w-0">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <Select value={sentimentFilter} onChange={setSentimentFilter} label="Sentiment" options={['all','positive','neutral','negative','mixed']} />
          <Select value={intentFilter} onChange={setIntentFilter} label="Intent" options={['all','complaint','question','recommendation','comparison','praise','trust-question','general']} />
          <Select value={actionFilter} onChange={setActionFilter} label="Action" options={['all','respond','escalate','monitor','ignore']} />
          <span className="text-xs text-[#64748b] ml-auto">{filtered.length} mentions</span>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[#475569] text-sm">
              No mentions match your filters.
            </div>
          ) : (
            filtered.map((m) => {
              const a = getAnalysis(m.analyses)
              return (
                <button
                  key={m.id}
                  onClick={() => setSelected(selected?.id === m.id ? null : m)}
                  className="w-full text-left p-4 rounded-xl bg-[#111927] border border-[#1e2d42] hover:border-[#2a3d55] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-[#64748b]">r/{m.subreddit}</span>
                    {m.is_post && <span className="text-[10px] px-1.5 py-0.5 bg-[#1c2a3e] text-[#64748b] rounded">Post</span>}
                    {a?.sarcasm && <span className="text-[10px] px-1.5 py-0.5 bg-[#f59e0b]/10 text-[#f59e0b] rounded">Sarcastic</span>}
                    {a?.intent === 'trust-question' && <span className="text-[10px] px-1.5 py-0.5 bg-[#FB3D78]/10 text-[#FB3D78] rounded">Trust Q</span>}
                    <span className="ml-auto text-[10px] text-[#475569]">
                      {formatDistanceToNow(parseISO(m.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  <p className="text-sm text-[#FEFEFE] mb-1.5 line-clamp-2">
                    {m.title ?? m.body}
                  </p>

                  <div className="flex items-center gap-3">
                    {a && (
                      <>
                        <span className="text-xs font-semibold tabular-nums" style={{ color: sentimentColor[a.sentiment] ?? '#64748b' }}>
                          {a.sentiment}
                        </span>
                        <span className="text-xs text-[#475569]">·</span>
                        <span className="text-xs text-[#64748b]">{a.intent}</span>
                        <span className="text-xs text-[#475569]">·</span>
                        <span className="text-xs text-[#64748b]">urgency {a.urgency}/5</span>
                        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded font-medium ${actionBadgeStyle[a.recommended_action] ?? ''}`}>
                          {a.recommended_action}
                        </span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: a.priority_score >= 80 ? '#f43f5e' : a.priority_score >= 60 ? '#f59e0b' : '#64748b' }}>
                          {a.priority_score}
                        </span>
                      </>
                    )}
                    {!a && <span className="text-xs text-[#475569]">Not yet analyzed</span>}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="w-80 shrink-0">
          <div className="bg-[#111927] border border-[#1e2d42] rounded-xl p-5 sticky top-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-[#64748b]">r/{selected.subreddit}</span>
              <button onClick={() => setSelected(null)} className="text-[#475569] hover:text-[#FEFEFE]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selected.title && (
              <h3 className="text-sm font-semibold text-[#FEFEFE] mb-2">{selected.title}</h3>
            )}
            <p className="text-xs text-[#94a3b8] mb-4 max-h-40 overflow-y-auto">{selected.body}</p>

            <a href={selected.url} target="_blank" rel="noopener noreferrer"
              className="block w-full text-center py-2 rounded-lg border border-[#1e2d42] text-xs text-[#64748b] hover:text-[#FEFEFE] hover:border-[#2a3d55] transition-colors mb-4">
              View on Reddit ↗
            </a>

            {getAnalysis(selected.analyses) && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-3">AI Analysis</div>
                {Object.entries({
                  Sentiment: getAnalysis(selected.analyses)!.sentiment,
                  Intent: getAnalysis(selected.analyses)!.intent,
                  Urgency: `${getAnalysis(selected.analyses)!.urgency}/5`,
                  'Trust Impact': getAnalysis(selected.analyses)!.trust_impact,
                  'Priority Score': `${getAnalysis(selected.analyses)!.priority_score}/100`,
                  Action: getAnalysis(selected.analyses)!.recommended_action,
                  'Team Owner': getAnalysis(selected.analyses)!.team_owner,
                  Sarcasm: getAnalysis(selected.analyses)!.sarcasm ? 'Detected' : 'None',
                }).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs">
                    <span className="text-[#64748b]">{k}</span>
                    <span className="text-[#FEFEFE] font-medium">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Select({
  value, onChange, label, options
}: { value: string; onChange: (v: string) => void; label: string; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 rounded-lg bg-[#111927] border border-[#1e2d42] text-xs text-[#94a3b8] focus:outline-none focus:border-[#2a3d55] appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o === 'all' ? `All ${label}s` : o}</option>
      ))}
    </select>
  )
}
