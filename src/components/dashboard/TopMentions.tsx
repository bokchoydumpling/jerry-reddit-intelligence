const priorityColor = (score: number) =>
  score >= 80 ? '#f43f5e' : score >= 60 ? '#f59e0b' : '#64748b'

const actionBadge: Record<string, { label: string; bg: string; text: string }> = {
  respond: { label: 'Respond', bg: '#FB3D78/10', text: '#FB3D78' },
  escalate: { label: 'Escalate', bg: '#f43f5e/10', text: '#f43f5e' },
  monitor: { label: 'Monitor', bg: '#f59e0b/10', text: '#f59e0b' },
  ignore: { label: 'Ignore', bg: '#1e2d42', text: '#64748b' },
}

interface MentionRow {
  mention_id: string
  priority_score: number
  sentiment: string
  intent: string
  recommended_action: string
  mention?: {
    id: string
    title: string | null
    body: string
    subreddit: string
    url: string
  }
}

export default function TopMentions({ mentions }: { mentions: MentionRow[] }) {
  return (
    <div className="bg-[#111927] border border-[#1e2d42] rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#FEFEFE]">High Priority Mentions</h3>
        <p className="text-xs text-[#64748b]">Priority score ≥ 60</p>
      </div>

      {mentions.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-[#475569] text-sm">
          No mentions yet. Run ingestion to fetch Reddit data.
        </div>
      ) : (
        <div className="space-y-3">
          {mentions.map((row) => {
            const badge = actionBadge[row.recommended_action] ?? actionBadge['monitor']
            const text = row.mention?.title ?? row.mention?.body ?? 'No content'

            return (
              <a
                key={row.mention_id}
                href={row.mention?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg bg-[#141D2C] border border-[#1e2d42] hover:border-[#2a3d55] transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: priorityColor(row.priority_score) }}
                  >
                    {row.priority_score}
                  </span>
                  <span className="text-[10px] text-[#64748b]">r/{row.mention?.subreddit}</span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: '#1c2a3e', color: badge.text }}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8] line-clamp-2">{text.slice(0, 120)}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-[#475569]">{row.sentiment}</span>
                  <span className="text-[10px] text-[#475569]">·</span>
                  <span className="text-[10px] text-[#475569]">{row.intent}</span>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
