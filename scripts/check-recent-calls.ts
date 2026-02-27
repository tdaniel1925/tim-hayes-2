/**
 * Check the most recent calls in the database
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const ACME_CONNECTION_ID = 'e2d7e69b-9179-4824-b21c-53249f63fdc2'

async function checkRecentCalls() {
  console.log('\n📞 Checking recent calls in database...\n')

  const { data: calls, error } = await supabase
    .from('cdr_records')
    .select(`
      id,
      uniqueid,
      src,
      dst,
      start_time,
      duration_seconds,
      disposition,
      processing_status,
      recording_filename,
      created_at
    `)
    .eq('pbx_connection_id', ACME_CONNECTION_ID)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (!calls || calls.length === 0) {
    console.log('❌ No calls found for Acme Corp connection')
    console.log('\n🔍 This means:')
    console.log('   1. The webhook was not triggered by the UCM')
    console.log('   2. OR the webhook URL is incorrect/not configured')
    console.log('   3. OR the webhook failed (check logs)')
    return
  }

  console.log(`✅ Found ${calls.length} recent calls:\n`)

  for (const call of calls) {
    const age = Math.floor((Date.now() - new Date(call.created_at).getTime()) / 1000)
    const ageStr = age < 60 ? `${age}s ago` :
                   age < 3600 ? `${Math.floor(age / 60)}m ago` :
                   `${Math.floor(age / 3600)}h ago`

    console.log(`┌─ Call: ${call.src} → ${call.dst}`)
    console.log(`│  Time: ${new Date(call.start_time).toLocaleString()}`)
    console.log(`│  Duration: ${call.duration_seconds}s`)
    console.log(`│  Disposition: ${call.disposition}`)
    console.log(`│  Status: ${call.processing_status}`)
    console.log(`│  Recording: ${call.recording_filename || 'None'}`)
    console.log(`│  Created: ${ageStr}`)
    console.log('└─\n')
  }

  // Check jobs for most recent call
  const { data: jobs } = await supabase
    .from('job_queue')
    .select('id, status, error_message, created_at')
    .eq('cdr_record_id', calls[0].id)
    .order('created_at', { ascending: false })

  if (jobs && jobs.length > 0) {
    console.log(`📋 Jobs for most recent call:`)
    for (const job of jobs) {
      console.log(`   - ${job.status.toUpperCase()}: ${job.id}`)
      if (job.error_message) {
        console.log(`     Error: ${job.error_message}`)
      }
    }
  }
}

checkRecentCalls()
