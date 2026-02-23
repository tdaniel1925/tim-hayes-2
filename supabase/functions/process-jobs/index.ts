// Supabase Edge Function: Process Jobs
// This function is invoked periodically by pg_cron to process pending jobs

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Import processing pipeline (shared logic from worker)
import { processJobPipeline } from './pipeline.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const maxConcurrentJobs = parseInt(Deno.env.get('WORKER_MAX_CONCURRENT_JOBS') ?? '3')
    const processedJobs: string[] = []
    const failedJobs: string[] = []

    // Process up to maxConcurrentJobs at once
    for (let i = 0; i < maxConcurrentJobs; i++) {
      try {
        // Claim next job using the claim_next_job() PostgreSQL function
        const { data: job, error: claimError } = await supabase.rpc('claim_next_job')

        if (claimError) {
          console.error('Error claiming job:', claimError)
          break
        }

        if (!job) {
          // No more pending jobs
          break
        }

        console.log(`Processing job ${job.id} (CDR: ${job.cdr_record_id})`)

        // Process the job using the pipeline
        const result = await processJobPipeline(job, supabase)

        if (result.success) {
          processedJobs.push(job.id)
          console.log(`✅ Job ${job.id} completed successfully`)
        } else {
          failedJobs.push(job.id)
          console.error(`❌ Job ${job.id} failed:`, result.error)
        }
      } catch (error) {
        console.error(`Error processing job:`, error)
        failedJobs.push('unknown')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedJobs: processedJobs.length,
        failedJobs: failedJobs.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
