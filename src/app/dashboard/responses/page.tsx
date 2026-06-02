import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import ResponseQueue from '@/components/responses/ResponseQueue'

export default async function ResponsesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const serviceClient = await createServiceClient()

  const userMentionIds = (
    await serviceClient.from('reddit_mentions').select('id').eq('user_id', user!.id)
  ).data?.map((m) => m.id) ?? []

  const { data: queue } = await serviceClient
    .from('analyses')
    .select(`
      mention_id, priority_score, sentiment, intent, urgency, recommended_action, team_owner,
      response_suggestions(id, body, tone, version, is_active),
      reddit_mentions!inner(id, subreddit, title, body, url, created_at)
    `)
    .in('mention_id', userMentionIds)
    .in('recommended_action', ['respond', 'escalate'])
    .order('priority_score', { ascending: false })
    .limit(50)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#FEFEFE]">Response Queue</h1>
        <p className="text-[#64748b] text-sm mt-1">Mentions that need a response, ranked by priority</p>
      </div>
      <ResponseQueue items={queue ?? []} />
    </div>
  )
}
