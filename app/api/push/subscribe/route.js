import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { subscription, admin_user_id } = await request.json()
    if (!subscription?.endpoint || !admin_user_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Upsert by endpoint — avoid duplicates
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('admin_user_id', admin_user_id)
      .eq('endpoint', subscription.endpoint)
      .maybeSingle()

    if (existing) {
      await supabase.from('push_subscriptions').update({ subscription }).eq('id', existing.id)
    } else {
      await supabase.from('push_subscriptions').insert({
        admin_user_id,
        endpoint: subscription.endpoint,
        subscription,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
