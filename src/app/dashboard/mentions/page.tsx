import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import MentionFeed from '@/components/mentions/MentionFeed'

export default async function MentionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const serviceClient = await createServiceClient()

  const { data: mentions } = await serviceClient
    .from('reddit_mentions')
    .select(`
      id, subreddit, title, body, url, score, is_post, created_at,
      analyses(sentiment, intent, urgency, priority_score, recommended_action, trust_impact, sarcasm, team_owner)
    `)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#FEFEFE]">Mention Feed</h1>
        <p className="text-[#64748b] text-sm mt-1">All Reddit mentions matching your keywords</p>
      </div>
      <MentionFeed mentions={mentions ?? []} />
    </div>
  )
}
