import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import CompetitorChart from '@/components/competitors/CompetitorChart'
import CompetitorManager from '@/components/competitors/CompetitorManager'

export default async function CompetitorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const serviceClient = await createServiceClient()

  const [{ data: competitors }, { data: sovData }] = await Promise.all([
    serviceClient.from('competitors').select('*').eq('user_id', user!.id).eq('active', true),
    serviceClient
      .from('share_of_voice_metrics')
      .select('entity_name, date, mention_count, subreddit')
      .eq('user_id', user!.id)
      .order('date', { ascending: true })
      .limit(200),
  ])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#FEFEFE]">Share of Voice</h1>
        <p className="text-[#64748b] text-sm mt-1">Jerry vs competitors on Reddit — last 30 days</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CompetitorChart sovData={sovData ?? []} competitors={competitors ?? []} />
        </div>
        <div>
          <CompetitorManager competitors={competitors ?? []} userId={user!.id} />
        </div>
      </div>
    </div>
  )
}
