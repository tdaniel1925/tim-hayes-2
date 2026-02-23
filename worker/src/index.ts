import express from 'express'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from parent .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

const PORT = process.env.WORKER_PORT || 3002
const POLL_INTERVAL_MS = 5000 // 5 seconds
const STALE_JOB_CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

// Supabase client (service role for worker operations)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
)

// Active jobs counter
let activeJobs = 0

// Express app for health check
const app = express()

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeJobs,
    timestamp: new Date().toISOString(),
  })
})

// Reset stale jobs (jobs stuck in processing for >10 minutes)
async function resetStaleJobs(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('reset_stale_jobs')

    if (error) {
      console.error('Error resetting stale jobs:', error)
      return 0
    }

    const resetCount = data || 0
    if (resetCount > 0) {
      console.log(`⚠️  Reset ${resetCount} stale job(s)`)
    }

    return resetCount
  } catch (error) {
    console.error('Unexpected error resetting stale jobs:', error)
    return 0
  }
}

// Claim and process the next job
async function claimAndProcessJob(): Promise<boolean> {
  try {
    // Claim next job using the database function
    const { data: jobs, error } = await supabase.rpc('claim_next_job')

    if (error) {
      console.error('Error claiming job:', error)
      return false
    }

    // If no job available, return false
    if (!jobs || jobs.length === 0) {
      return false
    }

    const job = jobs[0]
    activeJobs++

    console.log(`📋 Claimed job ${job.id} (attempt ${job.attempts}/${job.max_attempts})`)

    try {
      // Execute the full pipeline
      const { executePipeline } = await import('./pipeline')

      const result = await executePipeline({
        jobId: job.id,
        cdrRecordId: job.cdr_record_id,
        tenantId: job.tenant_id,
        connectionId: job.metadata.connection_id,
        recordingFilename: job.metadata.recording_filename,
      })

      if (result.success) {
        console.log(`   ✅ Job ${job.id} completed successfully`)
        return true
      } else {
        throw new Error(result.error || 'Pipeline failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`   ❌ Job ${job.id} failed:`, errorMessage)

      // Check if we've exceeded max attempts
      if (job.attempts >= job.max_attempts) {
        console.error(`   Max retries (${job.max_attempts}) reached, marking as failed`)

        // Mark job as permanently failed
        await supabase.rpc('fail_job', {
          p_job_id: job.id,
          p_error: errorMessage,
        })
      } else {
        console.log(`   Will retry (${job.attempts}/${job.max_attempts})`)

        // Reset job to pending for retry
        await supabase
          .from('job_queue')
          .update({
            status: 'pending',
            started_at: null,
            error: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id)
      }

      return false
    } finally {
      activeJobs--
    }
  } catch (error) {
    console.error('Unexpected error processing job:', error)
    return false
  }
}

// Main polling loop
async function startPolling() {
  console.log('🔄 Starting job polling loop (every 5s)...')

  // Poll continuously
  setInterval(async () => {
    await claimAndProcessJob()
  }, POLL_INTERVAL_MS)

  // Also try to claim a job immediately on startup
  await claimAndProcessJob()
}

// Start the worker
async function start() {
  console.log('='.repeat(60))
  console.log('🚀 AudiaPro Worker Starting...')
  console.log('='.repeat(60))
  console.log()

  // Reset stale jobs on startup
  console.log('🔧 Resetting stale jobs on startup...')
  const resetCount = await resetStaleJobs()
  if (resetCount === 0) {
    console.log('   No stale jobs found')
  }
  console.log()

  // Schedule periodic stale job resets
  setInterval(async () => {
    await resetStaleJobs()
  }, STALE_JOB_CHECK_INTERVAL_MS)

  // Start health check server
  app.listen(PORT, () => {
    console.log(`✅ Health check server running on http://localhost:${PORT}`)
    console.log(`   GET /health - Check worker status`)
    console.log()
  })

  // Start polling for jobs
  startPolling()

  console.log('✅ Worker initialized successfully')
  console.log()
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down worker...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down worker...')
  process.exit(0)
})

// Start the worker
start().catch((error) => {
  console.error('💥 Failed to start worker:', error)
  process.exit(1)
})
