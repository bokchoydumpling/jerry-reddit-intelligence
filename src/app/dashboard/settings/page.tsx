import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import KeywordManager from '@/components/settings/KeywordManager'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const serviceClient = await createServiceClient()

  const { data: keywords } = await serviceClient
    .from('keywords')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true })

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#FEFEFE]">Settings</h1>
        <p className="text-[#64748b] text-sm mt-1">Manage keywords, your account, and integrations</p>
      </div>

      <div className="space-y-6">
        <div className="bg-[#111927] border border-[#1e2d42] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#FEFEFE] mb-4">Account</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#64748b]">Email</span>
              <span className="text-[#FEFEFE]">{user!.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748b]">User ID</span>
              <span className="text-[#94a3b8] font-mono text-xs">{user!.id.slice(0, 8)}…</span>
            </div>
          </div>
        </div>

        <KeywordManager keywords={keywords ?? []} />

        <div className="bg-[#111927] border border-[#1e2d42] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#FEFEFE] mb-2">Integrations</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm text-[#FEFEFE]">Slack Alerts</div>
                <div className="text-xs text-[#64748b]">Fires when priority score ≥ 80 or urgency ≥ 4</div>
              </div>
              <span className="text-xs px-2 py-1 bg-[#10b981]/10 text-[#10b981] rounded">Connected</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-[#1e2d42]">
              <div>
                <div className="text-sm text-[#FEFEFE]">Reddit Data Source</div>
                <div className="text-xs text-[#64748b]">Public JSON endpoints (Apify-ready module)</div>
              </div>
              <span className="text-xs px-2 py-1 bg-[#10b981]/10 text-[#10b981] rounded">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
