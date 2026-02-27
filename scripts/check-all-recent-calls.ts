/**
 * Check ALL recent calls across all tenants
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAllRecentCalls() {
  console.log('\n📞 Checking ALL recent calls (all tenants)...\n')

  // Check calls in last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data: calls, error } = await supabase
    .from('cdr_records')
    .select(`
      id,
      src,
      dst,
      start_time,
      disposition,
      created_at,
      tenants(name)
    `)
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (!calls || calls.length === 0) {
    console.log('❌ No calls found in the last 5 minutes')
    console.log('\n🔍 This confirms the webhook was NOT triggered by the UCM\n')
    console.log('📋 To configure the webhook in your Grandstream UCM:')
    console.log('\n1. Log into UCM web interface (typically https://[ucm-ip]:8089)')
    console.log('2. Navigate to: Call Features → CDR')
    console.log('3. Enable "CDR HTTP Push"')
    console.log('4. Set URL to:')
    console.log('   https://fcubjohwzfhjcwcnwost.supabase.co/api/webhook/grandstream/e2d7e69b-9179-4824-b21c-53249f63fdc2')
    console.log('5. Set HTTP Method: POST')
    console.log('6. Set Authentication: Header')
    console.log('7. Add header: x-webhook-secret = [your webhook secret]')
    console.log('8. Test with a new call\n')
    return
  }

  console.log(`✅ Found ${calls.length} calls in last 5 minutes:\n`)

  for (const call of calls) {
    const tenant = call.tenants as any
    const age = Math.floor((Date.now() - new Date(call.created_at).getTime()) / 1000)

    console.log(`┌─ Call: ${call.src} → ${call.dst}`)
    console.log(`│  Tenant: ${tenant?.name || 'Unknown'}`)
    console.log(`│  Created: ${age}s ago`)
    console.log('└─')
  }
}

checkAllRecentCalls()
