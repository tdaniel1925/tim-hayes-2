/**
 * Monitor a test call in real-time through the full pipeline
 * Usage: Make a test call, then run this script to watch it process
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const ACME_CONNECTION_ID = 'e2d7e69b-9179-4824-b21c-53249f63fdc2'

interface CallStatus {
  cdrId: string
  uniqueid: string
  src: string
  dst: string
  startTime: string
  processingStatus: string
  recordingFilename: string | null
  recordingStoragePath: string | null
  jobId: string | null
  jobStatus: string | null
  jobError: string | null
  hasTranscript: boolean
  hasAnalysis: boolean
  sentimentOverall: string | null
}

async function getLatestCall(): Promise<CallStatus | null> {
  const { data: cdr, error: cdrError } = await supabase
    .from('cdr_records')
    .select(`
      id,
      uniqueid,
      src,
      dst,
      start_time,
      processing_status,
      recording_filename,
      recording_storage_path,
      transcript_text,
      call_analyses (
        sentiment_overall
      )
    `)
    .eq('pbx_connection_id', ACME_CONNECTION_ID)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (cdrError || !cdr) {
    return null
  }

  // Get associated job
  const { data: job } = await supabase
    .from('job_queue')
    .select('id, status, error_message, retry_count, started_at, completed_at')
    .eq('cdr_record_id', cdr.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const analysis = cdr.call_analyses as any

  return {
    cdrId: cdr.id,
    uniqueid: cdr.uniqueid,
    src: cdr.src,
    dst: cdr.dst,
    startTime: cdr.start_time,
    processingStatus: cdr.processing_status,
    recordingFilename: cdr.recording_filename,
    recordingStoragePath: cdr.recording_storage_path,
    jobId: job?.id || null,
    jobStatus: job?.status || null,
    jobError: job?.error_message || null,
    hasTranscript: !!cdr.transcript_text,
    hasAnalysis: !!analysis,
    sentimentOverall: analysis?.sentiment_overall || null,
  }
}

function getStepEmoji(completed: boolean, current: boolean): string {
  if (completed) return '✅'
  if (current) return '⏳'
  return '⏸️'
}

async function monitorCall() {
  console.log('\n🎯 Real-Time Call Monitor')
  console.log('='.repeat(60))
  console.log('\n💡 Make a test call now, or monitoring most recent call...\n')

  let lastStatus: CallStatus | null = null
  let iteration = 0
  const maxIterations = 120 // 10 minutes

  while (iteration < maxIterations) {
    const status = await getLatestCall()

    if (!status) {
      console.log('⏳ Waiting for a call to come in...')
      await new Promise(resolve => setTimeout(resolve, 5000))
      iteration++
      continue
    }

    // Check if this is a new call or status changed
    const statusChanged = !lastStatus ||
      lastStatus.cdrId !== status.cdrId ||
      lastStatus.processingStatus !== status.processingStatus ||
      lastStatus.jobStatus !== status.jobStatus ||
      lastStatus.hasTranscript !== status.hasTranscript ||
      lastStatus.hasAnalysis !== status.hasAnalysis

    if (statusChanged) {
      // Clear screen (optional - comment out if you want history)
      // console.clear()

      console.log('\n' + '─'.repeat(60))
      console.log(`📞 Call: ${status.src} → ${status.dst}`)
      console.log(`🕐 Time: ${new Date(status.startTime).toLocaleString()}`)
      console.log(`🆔 Unique ID: ${status.uniqueid}`)
      console.log('─'.repeat(60))

      // Pipeline Steps
      const webhookReceived = true // If we have a CDR, webhook worked
      const jobCreated = !!status.jobId
      const jobClaimed = status.jobStatus === 'processing' || status.jobStatus === 'completed' || status.jobStatus === 'failed'
      const recordingDownloaded = !!status.recordingStoragePath
      const transcriptDone = status.hasTranscript
      const analysisDone = status.hasAnalysis
      const fullyComplete = status.processingStatus === 'completed'

      console.log('\n📊 Pipeline Progress:\n')
      console.log(`${getStepEmoji(webhookReceived, false)} 1. Webhook received from UCM`)
      console.log(`${getStepEmoji(jobCreated, !jobCreated)} 2. Job created in queue`)

      if (status.jobId) {
        console.log(`   └─ Job ID: ${status.jobId}`)
        console.log(`   └─ Status: ${status.jobStatus?.toUpperCase() || 'UNKNOWN'}`)
        if (status.jobError) {
          console.log(`   └─ ❌ Error: ${status.jobError}`)
        }
      }

      console.log(`${getStepEmoji(jobClaimed, jobCreated && !jobClaimed)} 3. Worker claimed job`)
      console.log(`${getStepEmoji(recordingDownloaded, jobClaimed && !recordingDownloaded)} 4. Recording downloaded from UCM`)

      if (status.recordingStoragePath) {
        console.log(`   └─ Stored at: ${status.recordingStoragePath}`)
      }

      console.log(`${getStepEmoji(transcriptDone, recordingDownloaded && !transcriptDone)} 5. Transcription via Deepgram`)
      console.log(`${getStepEmoji(analysisDone, transcriptDone && !analysisDone)} 6. AI analysis via Claude`)

      if (status.sentimentOverall) {
        console.log(`   └─ Sentiment: ${status.sentimentOverall}`)
      }

      console.log(`${getStepEmoji(fullyComplete, analysisDone && !fullyComplete)} 7. Processing complete`)

      console.log('\n📈 Current Status:')
      console.log(`   CDR Processing: ${status.processingStatus?.toUpperCase() || 'UNKNOWN'}`)
      console.log(`   Job Status: ${status.jobStatus?.toUpperCase() || 'WAITING'}`)

      if (fullyComplete) {
        console.log('\n✨ SUCCESS! Call fully processed!')
        console.log(`\n🔗 View in UI: /admin/calls (filter by phone: ${status.src})`)
        console.log('\nMonitoring stopped.')
        break
      }

      if (status.jobStatus === 'failed') {
        console.log('\n❌ FAILED! Job processing failed.')
        console.log(`Error: ${status.jobError || 'Unknown error'}`)
        console.log('\nCheck worker logs for details.')
        break
      }

      lastStatus = status
    }

    // Wait 5 seconds before next check
    process.stdout.write(`\r⏳ Next check in 5s... (iteration ${iteration}/${maxIterations})`)
    await new Promise(resolve => setTimeout(resolve, 5000))
    iteration++
  }

  if (iteration >= maxIterations) {
    console.log('\n\n⏰ Monitoring timeout reached (10 minutes)')
    console.log('Call may still be processing - check /admin/jobs for status')
  }
}

monitorCall()
