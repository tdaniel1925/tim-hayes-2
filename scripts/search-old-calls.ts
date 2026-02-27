/**
 * Search for call records from 3-4 weeks ago
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function searchOldCalls() {
  console.log('\n🔍 Searching for calls from 3-4 weeks ago...\n')

  const now = new Date()
  const fourWeeksAgo = new Date(now)
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

  const threeWeeksAgo = new Date(now)
  threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21)

  console.log(`Date range: ${fourWeeksAgo.toDateString()} to ${threeWeeksAgo.toDateString()}\n`)

  const { data: calls, error } = await supabase
    .from('cdr_records')
    .select(`
      id,
      src,
      dst,
      disposition,
      duration_seconds,
      start_time,
      pbx_connection_id,
      tenants!inner (name)
    `)
    .gte('start_time', fourWeeksAgo.toISOString())
    .lte('start_time', threeWeeksAgo.toISOString())
    .order('start_time', { ascending: false })
    .limit(20)

  if (error) {
    console.error('❌ Error querying calls:', error)
    return
  }

  if (!calls || calls.length === 0) {
    console.log('📭 No calls found from 3-4 weeks ago')
    console.log('\nSearching for ANY calls older than 2 weeks...\n')

    const twoWeeksAgo = new Date(now)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    const { data: olderCalls, error: olderError } = await supabase
      .from('cdr_records')
      .select(`
        id,
        src,
        dst,
        disposition,
        duration_seconds,
        start_time,
        pbx_connection_id,
        tenants!inner (name)
      `)
      .lt('start_time', twoWeeksAgo.toISOString())
      .order('start_time', { ascending: false })
      .limit(20)

    if (olderError) {
      console.error('❌ Error querying older calls:', olderError)
      return
    }

    if (!olderCalls || olderCalls.length === 0) {
      console.log('📭 No calls older than 2 weeks found')
      return
    }

    console.log(`✅ Found ${olderCalls.length} call(s) older than 2 weeks:\n`)

    for (const call of olderCalls) {
      const tenant = call.tenants as any
      console.log(`┌─ Call: ${call.src} → ${call.dst}`)
      console.log(`│  Tenant: ${tenant?.name || 'Unknown'}`)
      console.log(`│  Duration: ${call.duration_seconds}s`)
      console.log(`│  Disposition: ${call.disposition}`)
      console.log(`│  Date: ${new Date(call.start_time).toLocaleString()}`)
      console.log(`│  Age: ${Math.floor((now.getTime() - new Date(call.start_time).getTime()) / (1000 * 60 * 60 * 24))} days ago`)
      console.log('└─\n')
    }
    return
  }

  console.log(`✅ Found ${calls.length} call(s) from 3-4 weeks ago:\n`)

  for (const call of calls) {
    const tenant = call.tenants as any
    console.log(`┌─ Call: ${call.src} → ${call.dst}`)
    console.log(`│  Tenant: ${tenant?.name || 'Unknown'}`)
    console.log(`│  Duration: ${call.duration_seconds}s`)
    console.log(`│  Disposition: ${call.disposition}`)
    console.log(`│  Date: ${new Date(call.start_time).toLocaleString()}`)
    console.log(`│  Age: ${Math.floor((now.getTime() - new Date(call.start_time).getTime()) / (1000 * 60 * 60 * 24))} days ago`)
    console.log('└─\n')
  }
}

searchOldCalls()
