import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mention_id, status, note } = await request.json()
  const serviceClient = await createServiceClient()

  const { error } = await serviceClient
    .from('statuses')
    .upsert({ mention_id, user_id: user.id, status, note, updated_at: new Date().toISOString() }, { onConflict: 'mention_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
