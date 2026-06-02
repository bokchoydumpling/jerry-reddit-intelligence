import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import TrustTracker from '@/components/trust/TrustTracker'

export default async function TrustPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const serviceClient = await createServiceClient()

  const userMentionIds = (
    await serviceClient.from('reddit_mentions').select('id').eq('user_id', user!.id)
  ).data?.map((m) => m.id) ?? []

  const { data: trustMentions } = await serviceClient
    .from('analyses')
    .select(`
      mention_id, urgency, priority_score, sentiment,
      response_suggestions(body, tone, is_active),
      reddit_mentions!inner(id, subreddit, title, body, url, created_at)
    `)
    .in('mention_id', userMentionIds)
    .eq('intent', 'trust-question')
    .order('priority_score', { ascending: false })
    .limit(50)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#FEFEFE]">Trust Question Tracker</h1>
        <p className="text-[#64748b] text-sm mt-1">Reddit users asking if Jerry is trustworthy or safe</p>
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111927] border border-[#1e2d42] rounded-xl p-4">
          <div className="text-xs text-[#64748b] mb-2 uppercase tracking-wider">Total Trust Questions</div>
          <div className="text-3xl font-bold text-[#FB3D78]">{trustMentions?.length ?? 0}</div>
        </div>
        <div className="bg-[#111927] border border-[#1e2d42] rounded-xl p-4">
          <div className="text-xs text-[#64748b] mb-2 uppercase tracking-wider">High Urgency</div>
          <div className="text-3xl font-bold text-[#f43f5e]">
            {trustMentions?.filter((m) => m.urgency >= 4).length ?? 0}
          </div>
        </div>
        <div className="bg-[#111927] border border-[#1e2d42] rounded-xl p-4">
          <div className="text-xs text-[#64748b] mb-2 uppercase tracking-wider">Avg Priority</div>
          <div className="text-3xl font-bold text-[#f59e0b]">
            {trustMentions?.length
              ? Math.round(trustMentions.reduce((s, m) => s + m.priority_score, 0) / trustMentions.length)
              : 0}
          </div>
        </div>
      </div>

      <TrustTracker items={trustMentions ?? []} />
    </div>
  )
}
