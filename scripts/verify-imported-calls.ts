/**
 * Verify imported CDR records are in database
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const ACME_CONNECTION_ID = 'e2d7e69b-9179-4824-b21c-53249f63fdc2'

async function verifyImportedCalls() {
  console.log('\n✅ Verifying imported CDR records...\n')

  // Get all CDR records for Acme connection
  const { data: calls, error } = await supabase
    .from('cdr_records')
    .select('id, uniqueid, src, dst, start_time, recording_filename, recording_storage_path, processing_status, created_at')
    .eq('pbx_connection_id', ACME_CONNECTION_ID)
    .like('uniqueid', 'imported-%')
    .order('start_time', { ascending: true })

  if (error) {
    console.error('❌ Error fetching calls:', error)
    return
  }

  console.log(`📊 Found ${calls?.length || 0} imported CDR records:\n`)

  if (!calls || calls.length === 0) {
    console.log('⚠️  No imported calls found!')
    return
  }

  for (const call of calls) {
    console.log(`┌─ Call from ${call.src} → ${call.dst}`)
    console.log(`│  Time: ${new Date(call.start_time).toLocaleString()}`)
    console.log(`│  Recording: ${call.recording_filename}`)
    console.log(`│  Storage: ${call.recording_storage_path}`)
    console.log(`│  Status: ${call.processing_status}`)
    console.log(`│  Created: ${new Date(call.created_at).toLocaleString()}`)
    console.log('└─\n')
  }

  // Check jobs
  const { data: jobs, error: jobError } = await supabase
    .from('job_queue')
    .select('id, cdr_record_id, job_type, status, priority, created_at')
    .in('cdr_record_id', calls.map(c => c.id))
    .order('created_at', { ascending: true })

  if (jobError) {
    console.error('❌ Error fetching jobs:', jobError)
    return
  }

  console.log(`\n📋 Found ${jobs?.length || 0} jobs for imported recordings:`)

  if (jobs && jobs.length > 0) {
    const statusCounts = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log(`   Status breakdown:`)
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`   - ${status}: ${count}`)
    }
  }

  console.log(`\n💡 Next steps:`)
  console.log(`   1. The 30 recordings will appear in the Calls page at /admin/calls`)
  console.log(`   2. Run the worker to process these recordings (transcription + AI analysis)`)
  console.log(`   3. New calls will be automatically captured via webhook`)
}

verifyImportedCalls()
