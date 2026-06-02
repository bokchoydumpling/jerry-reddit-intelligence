'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, parseISO } from 'date-fns'

interface Snapshot {
  date: string
  total_mentions: number
  positive_count: number
  negative_count: number
  neutral_count: number
}

export default function SentimentTrend({ snapshots }: { snapshots: Snapshot[] }) {
  const data = snapshots.map((s) => ({
    date: format(parseISO(s.date), 'MMM d'),
    Positive: s.positive_count,
    Negative: s.negative_count,
    Neutral: s.neutral_count,
    Total: s.total_mentions,
  }))

  return (
    <div className="bg-[#111927] border border-[#1e2d42] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#FEFEFE]">Sentiment Trend</h3>
          <p className="text-xs text-[#64748b]">7-day rolling</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-[#475569] text-sm">
          No snapshot data yet. Run ingestion to populate.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              contentStyle={{ background: '#141D2C', border: '1px solid #1e2d42', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
            <Line type="monotone" dataKey="Positive" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Negative" stroke="#f43f5e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Neutral" stroke="#64748b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
