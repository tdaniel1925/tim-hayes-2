/**
 * Check for existing CDR records, jobs, and call analyses
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkExistingData() {
  console.log('\n📊 Checking existing call data...\n')

  // Check CDR records
  const { data: cdrs, error: cdrError } = await supabase
    .from('cdr_records')
    .select('id, src, dst, disposition, duration_seconds, start_time, pbx_connection_id')
    .order('start_time', { ascending: false })
    .limit(10)

  if (cdrError) {
    console.error('❌ Error querying CDR records:', cdrError)
  } else if (cdrs && cdrs.length > 0) {
    console.log(`✅ Found ${cdrs.length} recent CDR records:\n`)
    for (const cdr of cdrs) {
      console.log(`┌─ Call: ${cdr.src} → ${cdr.dst}`)
      console.log(`│  ID: ${cdr.id}`)
      console.log(`│  Duration: ${cdr.duration_seconds}s`)
      console.log(`│  Disposition: ${cdr.disposition}`)
      console.log(`│  Start: ${new Date(cdr.start_time).toLocaleString()}`)
      console.log(`│  Connection: ${cdr.pbx_connection_id}`)
      console.log('└─\n')
    }
  } else {
    console.log('📭 No CDR records found\n')
  }

  // Check jobs
  const { data: jobs, error: jobError } = await supabase
    .from('job_queue')
    .select('id, job_type, status, created_at, error')
    .order('created_at', { ascending: false })
    .limit(10)

  if (jobError) {
    console.error('❌ Error querying jobs:', jobError)
  } else if (jobs && jobs.length > 0) {
    console.log(`✅ Found ${jobs.length} recent jobs:\n`)
    for (const job of jobs) {
      console.log(`┌─ Job: ${job.job_type}`)
      console.log(`│  ID: ${job.id}`)
      console.log(`│  Status: ${job.status}`)
      console.log(`│  Created: ${new Date(job.created_at).toLocaleString()}`)
      console.log(`│  Error: ${job.error || 'None'}`)
      console.log('└─\n')
    }
  } else {
    console.log('📭 No jobs found\n')
  }

  // Check call analyses
  const { data: analyses, error: analysisError } = await supabase
    .from('call_analyses')
    .select('id, cdr_record_id, sentiment_overall, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (analysisError) {
    console.error('❌ Error querying analyses:', analysisError)
  } else if (analyses && analyses.length > 0) {
    console.log(`✅ Found ${analyses.length} analyzed calls:\n`)
    for (const analysis of analyses) {
      console.log(`┌─ Analysis`)
      console.log(`│  ID: ${analysis.id}`)
      console.log(`│  CDR: ${analysis.cdr_record_id}`)
      console.log(`│  Sentiment: ${analysis.sentiment_overall}`)
      console.log(`│  Created: ${new Date(analysis.created_at).toLocaleString()}`)
      console.log('└─\n')
    }
  } else {
    console.log('📭 No call analyses found\n')
  }

  // Check recordings in storage
  const { data: recordings, error: storageError } = await supabase.storage
    .from('recordings')
    .list('', { limit: 10, sortBy: { column: 'created_at', order: 'desc' } })

  if (storageError) {
    console.error('❌ Error listing recordings:', storageError)
  } else if (recordings && recordings.length > 0) {
    console.log(`✅ Found ${recordings.length} recordings in storage:\n`)
    for (const rec of recordings) {
      console.log(`  - ${rec.name} (${(rec.metadata?.size / 1024 / 1024).toFixed(2)} MB)`)
    }
  } else {
    console.log('📭 No recordings in storage\n')
  }
}

checkExistingData()
