import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import MetricCard from '@/components/dashboard/MetricCard'
import SentimentTrend from '@/components/dashboard/SentimentTrend'
import TopMentions from '@/components/dashboard/TopMentions'
import IngestButton from '@/components/dashboard/IngestButton'
import DateRangePicker from '@/components/dashboard/DateRangePicker'
import { RANGE_OPTIONS, DEFAULT_RANGE, rangeLabel, sinceDate } from '@/lib/date-range'
import type { RangeValue } from '@/lib/date-range'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range: rawRange } = await searchParams
  const range = (RANGE_OPTIONS.some((o) => o.value === rawRange) ? rawRange : DEFAULT_RANGE) as RangeValue
  const days = parseInt(range, 10)
  const since = sinceDate(days)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const serviceClient = await createServiceClient()

  // All user mention IDs (unscoped — for analyses join)
  const { data: allMentionRows } = await serviceClient
    .from('reddit_mentions')
    .select('id')
    .eq('user_id', user!.id)
  const allMentionIds = allMentionRows?.map((m) => m.id) ?? []

  // Mention IDs within the selected date range
  const { data: rangedMentionRows, count: totalMentions } = await serviceClient
    .from('reddit_mentions')
    .select('id', { count: 'exact' })
    .eq('user_id', user!.id)
    .gte('created_at', since)
  const rangedMentionIds = rangedMentionRows?.map((m) => m.id) ?? []

  // Analyses scoped to the range (empty array guard: return early with zeros)
  const analyses = rangedMentionIds.length
    ? (await serviceClient
        .from('analyses')
        .select('sentiment, priority_score, intent, mention_id')
        .in('mention_id', rangedMentionIds)
        .order('priority_score', { ascending: false })
      ).data ?? []
    : []

  const trustCount = analyses.filter((a) => a.intent === 'trust-question').length

  const sentimentBreakdown = analyses.reduce(
    (acc, a) => {
      if (a.sentiment) acc[a.sentiment] = (acc[a.sentiment] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const avgPriority = analyses.length
    ? Math.round(analyses.reduce((s, a) => s + (a.priority_score ?? 0), 0) / analyses.length)
    : 0

  const highPriorityCount = analyses.filter((a) => (a.priority_score ?? 0) >= 80).length

  // Trend snapshots — limit bucket count to the range
  const snapshotLimit = days <= 7 ? 7 : days <= 30 ? 30 : days <= 90 ? 13 : days <= 180 ? 26 : 52
  const { data: snapshots } = await serviceClient
    .from('metric_snapshots')
    .select('date, total_mentions, positive_count, negative_count, neutral_count')
    .eq('user_id', user!.id)
    .gte('date', since.slice(0, 10))
    .order('date', { ascending: true })
    .limit(snapshotLimit)

  // Top high-priority mentions in range
  const topAnalyses = rangedMentionIds.length
    ? (await serviceClient
        .from('analyses')
        .select('mention_id, priority_score, sentiment, intent, recommended_action')
        .in('mention_id', rangedMentionIds)
        .gte('priority_score', 60)
        .order('priority_score', { ascending: false })
        .limit(5)
      ).data ?? []
    : []

  const topMentionDetails = topAnalyses.length
    ? (await serviceClient
        .from('reddit_mentions')
        .select('id, title, body, subreddit, url, created_at')
        .in('id', topAnalyses.map((a) => a.mention_id))
      ).data ?? []
    : []

  const topMentions = topAnalyses.map((a) => ({
    ...a,
    mention: topMentionDetails.find((m) => m.id === a.mention_id),
  }))

  return (
    <div className="p-8">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#FEFEFE]">Overview</h1>
          <p className="text-[#64748b] text-sm mt-1">{rangeLabel(range)} · Reddit intelligence</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Suspense fallback={null}>
            <DateRangePicker />
          </Suspense>
          <IngestButton />
        </div>
      </div>

      {/* Metric row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Mentions"
          value={(totalMentions ?? 0).toString()}
          sub={rangeLabel(range).toLowerCase()}
          color="primary"
        />
        <MetricCard
          label="Avg Priority Score"
          value={avgPriority.toString()}
          sub="out of 100"
          color={avgPriority >= 70 ? 'negative' : avgPriority >= 50 ? 'warning' : 'positive'}
        />
        <MetricCard
          label="High Priority"
          value={highPriorityCount.toString()}
          sub="need attention"
          color={highPriorityCount > 5 ? 'negative' : 'warning'}
        />
        <MetricCard
          label="Trust Questions"
          value={trustCount.toString()}
          sub="open questions"
          color={trustCount > 3 ? 'negative' : 'muted'}
        />
      </div>

      {/* Sentiment breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Positive', key: 'positive', color: '#10b981' },
          { label: 'Neutral',  key: 'neutral',  color: '#64748b' },
          { label: 'Negative', key: 'negative', color: '#f43f5e' },
        ].map((s) => (
          <div key={s.key} className="bg-[#111927] border border-[#1e2d42] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#64748b]">{s.label}</span>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            </div>
            <div className="text-2xl font-bold text-[#FEFEFE]">
              {sentimentBreakdown[s.key] ?? 0}
            </div>
            <div className="text-xs text-[#64748b] mt-1">
              {analyses.length > 0
                ? `${Math.round(((sentimentBreakdown[s.key] ?? 0) / analyses.length) * 100)}%`
                : '0%'}
            </div>
            <div className="mt-3 h-1 bg-[#1e2d42] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: analyses.length > 0
                    ? `${Math.round(((sentimentBreakdown[s.key] ?? 0) / analyses.length) * 100)}%`
                    : '0%',
                  backgroundColor: s.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SentimentTrend snapshots={snapshots ?? []} />
        <TopMentions mentions={topMentions} />
      </div>
    </div>
  )
}
