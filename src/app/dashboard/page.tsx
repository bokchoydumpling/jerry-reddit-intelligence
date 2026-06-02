import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import MetricCard from '@/components/dashboard/MetricCard'
import SentimentTrend from '@/components/dashboard/SentimentTrend'
import TopMentions from '@/components/dashboard/TopMentions'
import IngestButton from '@/components/dashboard/IngestButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const serviceClient = await createServiceClient()

  // Fetch aggregate metrics
  const [mentionsRes, analysesRes, trustRes] = await Promise.all([
    serviceClient
      .from('reddit_mentions')
      .select('id, created_at, subreddit', { count: 'exact' })
      .eq('user_id', user!.id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    serviceClient
      .from('analyses')
      .select('sentiment, priority_score, recommended_action, mention_id')
      .in(
        'mention_id',
        (await serviceClient
          .from('reddit_mentions')
          .select('id')
          .eq('user_id', user!.id)
        ).data?.map((m) => m.id) ?? []
      )
      .order('priority_score', { ascending: false }),
    serviceClient
      .from('analyses')
      .select('mention_id')
      .eq('intent', 'trust-question')
      .in(
        'mention_id',
        (await serviceClient
          .from('reddit_mentions')
          .select('id')
          .eq('user_id', user!.id)
        ).data?.map((m) => m.id) ?? []
      ),
  ])

  const totalMentions = mentionsRes.count ?? 0
  const analyses = analysesRes.data ?? []
  const trustCount = trustRes.data?.length ?? 0

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
  const positiveRatio = analyses.length
    ? Math.round(((sentimentBreakdown['positive'] ?? 0) / analyses.length) * 100)
    : 0

  // 7-day trend data
  const { data: snapshots } = await serviceClient
    .from('metric_snapshots')
    .select('date, total_mentions, positive_count, negative_count, neutral_count')
    .eq('user_id', user!.id)
    .order('date', { ascending: true })
    .limit(7)

  // Top high-priority mentions
  const { data: topMentionIds } = await serviceClient
    .from('analyses')
    .select('mention_id, priority_score, sentiment, intent, recommended_action')
    .in(
      'mention_id',
      (await serviceClient.from('reddit_mentions').select('id').eq('user_id', user!.id)).data?.map(m => m.id) ?? []
    )
    .gte('priority_score', 60)
    .order('priority_score', { ascending: false })
    .limit(5)

  const topMentionDetails = topMentionIds?.length
    ? (await serviceClient
        .from('reddit_mentions')
        .select('id, title, body, subreddit, url, created_at')
        .in('id', topMentionIds.map(m => m.mention_id))
      ).data ?? []
    : []

  const topMentions = topMentionIds?.map((a) => ({
    ...a,
    mention: topMentionDetails.find((m) => m.id === a.mention_id),
  })) ?? []

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#FEFEFE]">Overview</h1>
          <p className="text-[#64748b] text-sm mt-1">Last 7 days · Reddit intelligence</p>
        </div>
        <IngestButton />
      </div>

      {/* Metric row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Mentions"
          value={totalMentions.toString()}
          sub="last 7 days"
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
          { label: 'Neutral', key: 'neutral', color: '#64748b' },
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
                  width: analyses.length > 0 ? `${Math.round(((sentimentBreakdown[s.key] ?? 0) / analyses.length) * 100)}%` : '0%',
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
