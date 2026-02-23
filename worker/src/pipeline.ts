/**
 * Full Pipeline Integration
 * Orchestrates the complete call processing workflow:
 * download → upload to storage → transcribe → analyze → save → update CDR → increment usage
 */

import { createClient } from '@supabase/supabase-js'
import { downloadRecording } from './steps/download'
import { transcribeAudio } from './steps/transcribe'
import { analyzeCall } from './steps/analyze'
import { decrypt } from './lib/encryption'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
)

export interface JobContext {
  jobId: string
  cdrRecordId: string
  tenantId: string
  connectionId: string
  recordingFilename: string
}

export interface PipelineResult {
  success: boolean
  error?: string
}

/**
 * Execute the full pipeline for a job
 */
export async function executePipeline(job: JobContext): Promise<PipelineResult> {
  console.log(`🔄 Starting pipeline for job ${job.jobId}`)

  try {
    // Step 1: Fetch connection details
    console.log('   Step 1: Fetching connection details...')
    const { data: connection, error: connError } = await supabase
      .from('pbx_connections')
      .select('host, port, username, password_encrypted, connection_type')
      .eq('id', job.connectionId)
      .single()

    if (connError || !connection) {
      throw new Error(`Failed to fetch connection: ${connError?.message || 'Not found'}`)
    }

    // Decrypt password
    const password = decrypt(connection.password_encrypted)

    // Step 2: Download recording
    console.log('   Step 2: Downloading recording...')
    const downloadResult = await downloadRecording({
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password,
      recordingFilename: job.recordingFilename,
      verifySsl: false,
    })

    console.log(`   ✓ Downloaded ${downloadResult.sizeBytes} bytes in ${downloadResult.attempts} attempt(s)`)

    // Step 3: Upload recording to Supabase Storage
    console.log('   Step 3: Uploading recording to storage...')
    const recordingPath = `${job.tenantId}/${job.cdrRecordId}.wav`
    const { error: uploadError } = await supabase.storage
      .from('call-recordings')
      .upload(recordingPath, downloadResult.buffer, {
        contentType: 'audio/wav',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Failed to upload recording: ${uploadError.message}`)
    }

    console.log(`   ✓ Uploaded to storage: ${recordingPath}`)

    // Step 4: Transcribe audio
    console.log('   Step 4: Transcribing audio...')
    const transcription = await transcribeAudio({
      apiKey: process.env.DEEPGRAM_API_KEY!,
      audioBuffer: downloadResult.buffer,
    })

    console.log(`   ✓ Transcribed ${transcription.text.length} chars, ${transcription.utterances.length} utterances, ${transcription.speakers.length} speakers`)

    // Step 5: Upload transcript to storage
    console.log('   Step 5: Uploading transcript to storage...')
    const transcriptPath = `${job.tenantId}/${job.cdrRecordId}.json`
    const { error: transcriptUploadError } = await supabase.storage
      .from('call-transcripts')
      .upload(
        transcriptPath,
        JSON.stringify({
          text: transcription.text,
          utterances: transcription.utterances,
          speakers: transcription.speakers,
          duration: transcription.duration,
        }),
        {
          contentType: 'application/json',
          upsert: true,
        }
      )

    if (transcriptUploadError) {
      throw new Error(`Failed to upload transcript: ${transcriptUploadError.message}`)
    }

    console.log(`   ✓ Uploaded transcript: ${transcriptPath}`)

    // Step 6: Fetch CDR metadata for analysis
    console.log('   Step 6: Fetching CDR metadata...')
    const { data: cdr, error: cdrError } = await supabase
      .from('cdr_records')
      .select('src, dst, duration_seconds, direction')
      .eq('id', job.cdrRecordId)
      .single()

    if (cdrError || !cdr) {
      throw new Error(`Failed to fetch CDR: ${cdrError?.message || 'Not found'}`)
    }

    // Step 7: AI Analysis
    console.log('   Step 7: Analyzing call with Claude AI...')
    const analysis = await analyzeCall({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      transcript: transcription.text,
      callMetadata: {
        src: cdr.src,
        dst: cdr.dst,
        duration: cdr.duration_seconds,
        direction: cdr.direction,
      },
      speakerStats: transcription.speakers,
    })

    console.log(`   ✓ Analysis complete: ${analysis.sentiment} sentiment, ${analysis.escalationRisk} risk`)

    // Step 8: Upload analysis to storage
    console.log('   Step 8: Uploading analysis to storage...')
    const analysisPath = `${job.tenantId}/${job.cdrRecordId}.json`
    const { error: analysisUploadError } = await supabase.storage
      .from('call-analyses')
      .upload(analysisPath, JSON.stringify(analysis), {
        contentType: 'application/json',
        upsert: true,
      })

    if (analysisUploadError) {
      throw new Error(`Failed to upload analysis: ${analysisUploadError.message}`)
    }

    console.log(`   ✓ Uploaded analysis: ${analysisPath}`)

    // Step 9: Save analysis to database
    console.log('   Step 9: Saving analysis to database...')
    const { error: insertError } = await supabase.from('call_analyses').insert({
      cdr_record_id: job.cdrRecordId,
      tenant_id: job.tenantId,
      summary: analysis.summary,
      sentiment: analysis.sentiment,
      sentiment_score: analysis.sentimentScore,
      keywords: analysis.keywords,
      topics: analysis.topics,
      action_items: analysis.actionItems,
      questions: analysis.questions,
      objections: analysis.objections,
      escalation_risk: analysis.escalationRisk,
      escalation_reasons: analysis.escalationReasons,
      satisfaction_prediction: analysis.satisfactionPrediction,
      compliance_flags: analysis.complianceFlags,
      call_disposition: analysis.callDisposition,
      talk_ratio_speaker_0: analysis.talkRatio?.speaker0Percentage,
      talk_ratio_speaker_1: analysis.talkRatio?.speaker1Percentage,
      analysis_storage_path: analysisPath,
    })

    if (insertError) {
      throw new Error(`Failed to save analysis: ${insertError.message}`)
    }

    console.log(`   ✓ Analysis saved to database`)

    // Step 10: Update CDR record with storage paths
    console.log('   Step 10: Updating CDR record...')
    const { error: updateCdrError } = await supabase
      .from('cdr_records')
      .update({
        recording_storage_path: recordingPath,
        transcript_storage_path: transcriptPath,
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', job.cdrRecordId)

    if (updateCdrError) {
      throw new Error(`Failed to update CDR: ${updateCdrError.message}`)
    }

    console.log(`   ✓ CDR record updated`)

    // Step 11: Increment usage counter
    console.log('   Step 11: Incrementing usage counter...')
    const { error: usageError } = await supabase.rpc('increment_tenant_usage', {
      p_tenant_id: job.tenantId,
    })

    if (usageError) {
      console.warn(`   ⚠️  Failed to increment usage: ${usageError.message}`)
      // Don't fail the job if usage increment fails
    } else {
      console.log(`   ✓ Usage counter incremented`)
    }

    // Step 12: Mark job as completed
    console.log('   Step 12: Marking job as completed...')
    const { error: completeError } = await supabase.rpc('complete_job', {
      p_job_id: job.jobId,
      p_result: {
        recordingPath,
        transcriptPath,
        analysisPath,
        sentiment: analysis.sentiment,
        duration: transcription.duration,
      },
    })

    if (completeError) {
      throw new Error(`Failed to complete job: ${completeError.message}`)
    }

    console.log(`   ✓ Job marked as completed`)
    console.log(`✅ Pipeline completed successfully for job ${job.jobId}`)

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`❌ Pipeline failed for job ${job.jobId}: ${errorMessage}`)

    // Update CDR status to failed
    await supabase
      .from('cdr_records')
      .update({
        processing_status: 'failed',
        processing_error: errorMessage,
      })
      .eq('id', job.cdrRecordId)

    return {
      success: false,
      error: errorMessage,
    }
  }
}
