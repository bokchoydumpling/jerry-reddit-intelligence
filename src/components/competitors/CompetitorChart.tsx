'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'

interface SovRow {
  entity_name: string
  date: string
  mention_count: number
  subreddit: string | null
}

interface Competitor {
  id: string
  name: string
  color: string
}

const JERRY_COLOR = '#FB3D78'
const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4']

export default function CompetitorChart({
  sovData, competitors
}: { sovData: SovRow[]; competitors: Competitor[] }) {
  const allEntities = ['Jerry', ...competitors.map((c) => c.name)]
  const colorMap: Record<string, string> = {
    Jerry: JERRY_COLOR,
    ...Object.fromEntries(competitors.map((c, i) => [c.name, c.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]])),
  }

  // Aggregate by entity
  const totals = allEntities.map((entity) => ({
    name: entity,
    mentions: sovData.filter((r) => r.entity_name === entity).reduce((s, r) => s + r.mention_count, 0),
  })).sort((a, b) => b.mentions - a.mentions)

  const total = totals.reduce((s, t) => s + t.mentions, 0)

  return (
    <div className="bg-[#111927] border border-[#1e2d42] rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#FEFEFE]">Mention Share of Voice</h3>
        <p className="text-xs text-[#64748b]">Total Reddit mentions by brand</p>
      </div>

      {total === 0 ? (
        <div className="flex items-center justify-center h-48 text-[#475569] text-sm">
          No share of voice data yet. Run ingestion first.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {totals.map((t) => (
              <div key={t.name} className="bg-[#141D2C] rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorMap[t.name] ?? '#64748b' }} />
                  <span className="text-xs text-[#64748b] truncate">{t.name}</span>
                </div>
                <div className="text-lg font-bold text-[#FEFEFE]">{t.mentions}</div>
                <div className="text-xs text-[#475569]">{total > 0 ? Math.round((t.mentions / total) * 100) : 0}%</div>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={totals} layout="vertical" margin={{ left: 0 }}>
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip
                contentStyle={{ background: '#141D2C', border: '1px solid #1e2d42', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="mentions" radius={4}>
                {totals.map((t) => (
                  <Cell key={t.name} fill={colorMap[t.name] ?? '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
