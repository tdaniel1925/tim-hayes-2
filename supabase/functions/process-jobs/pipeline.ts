// Processing Pipeline for Supabase Edge Function
// Adapted from worker/src/pipeline.ts for Deno runtime

export async function processJobPipeline(job: any, supabase: any) {
  try {
    // 1. Get CDR record and connection details
    const { data: cdr, error: cdrError } = await supabase
      .from('cdr_records')
      .select(`
        *,
        pbx_connections!inner(
          id,
          connection_type,
          host,
          port,
          username,
          password_encrypted,
          verify_ssl
        )
      `)
      .eq('id', job.cdr_record_id)
      .single()

    if (cdrError || !cdr) {
      throw new Error(`Failed to fetch CDR record: ${cdrError?.message}`)
    }

    const connection = cdr.pbx_connections

    // 2. Download recording from Grandstream PBX
    console.log(`Downloading recording: ${cdr.recording_filename}`)
    const audioBuffer = await downloadRecording(cdr, connection)

    if (!audioBuffer) {
      throw new Error('Failed to download recording')
    }

    // 3. Upload to Supabase Storage
    console.log('Uploading to Supabase Storage...')
    const storagePath = `${cdr.tenant_id}/${new Date(cdr.start_time).getFullYear()}/${
      new Date(cdr.start_time).getMonth() + 1
    }/${cdr.uniqueid}.wav`

    const { error: uploadError } = await supabase.storage
      .from('call-recordings')
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/wav',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Failed to upload recording: ${uploadError.message}`)
    }

    // Update CDR with storage path
    await supabase
      .from('cdr_records')
      .update({ recording_storage_path: storagePath })
      .eq('id', cdr.id)

    // 4. Transcribe with Deepgram
    console.log('Transcribing with Deepgram...')
    const transcript = await transcribeAudio(audioBuffer)

    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Transcription resulted in empty text')
    }

    // 5. Analyze with Claude
    console.log('Analyzing with Claude...')
    const analysis = await analyzeTranscript(cdr, transcript)

    // 6. Save analysis to database
    console.log('Saving analysis...')
    const { error: analysisError } = await supabase.from('call_analyses').insert({
      tenant_id: cdr.tenant_id,
      cdr_record_id: cdr.id,
      summary: analysis.summary,
      sentiment_overall: analysis.sentiment,
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
    })

    if (analysisError) {
      throw new Error(`Failed to save analysis: ${analysisError.message}`)
    }

    // 7. Update job status to completed
    await supabase
      .from('job_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: { success: true },
      })
      .eq('id', job.id)

    // 8. Increment tenant usage counters
    await supabase.rpc('increment', {
      table_name: 'tenants',
      row_id: cdr.tenant_id,
      column_name: 'calls_processed_total',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Pipeline error:', error)

    // Update job status to failed
    await supabase
      .from('job_queue')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: error.message,
        retry_count: (job.retry_count || 0) + 1,
      })
      .eq('id', job.id)

    return { success: false, error: error.message }
  }
}

// Download recording from Grandstream PBX
async function downloadRecording(cdr: any, connection: any): Promise<ArrayBuffer | null> {
  const { decrypt } = await import('./crypto.ts')
  const password = decrypt(connection.password_encrypted)

  // Build recording URL
  const baseUrl = `https://${connection.host}:${connection.port}`
  const recordingPath = `/cdrapi/recording?callid=${cdr.callid}`
  const url = `${baseUrl}${recordingPath}`

  try {
    // Authenticate and download
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${btoa(`${connection.username}:${password}`)}`,
      },
      // Note: Deno fetch doesn't support rejectUnauthorized option
      // SSL verification is handled at the Deno runtime level
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.arrayBuffer()
  } catch (error: any) {
    console.error('Download error:', error)
    return null
  }
}

// Transcribe audio with Deepgram
async function transcribeAudio(audioBuffer: ArrayBuffer): Promise<string> {
  const apiKey = Deno.env.get('DEEPGRAM_API_KEY')
  if (!apiKey) {
    throw new Error('DEEPGRAM_API_KEY not configured')
  }

  const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&diarize=true', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'audio/wav',
    },
    body: audioBuffer,
  })

  if (!response.ok) {
    throw new Error(`Deepgram API error: ${response.status}`)
  }

  const result = await response.json()
  const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''

  return transcript
}

// Analyze transcript with Claude
async function analyzeTranscript(cdr: any, transcript: string): Promise<any> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const prompt = `You are an expert call analyst. Analyze the following call transcript and provide structured insights.

Call Details:
- Caller: ${cdr.src}
- Destination: ${cdr.dst}
- Duration: ${cdr.duration_seconds} seconds
- Direction: ${cdr.call_direction}

Transcript:
${transcript}

Provide your analysis as a JSON object with EXACTLY this structure (no markdown, no backticks, just raw JSON):
{
  "summary": "Brief 2-3 sentence summary of the call",
  "sentiment": "positive|negative|neutral|mixed",
  "sentimentScore": 0.0 to 1.0,
  "keywords": ["keyword1", "keyword2", ...],
  "topics": ["topic1", "topic2", ...],
  "actionItems": ["action1", "action2", ...],
  "questions": ["question1", "question2", ...],
  "objections": ["objection1", "objection2", ...],
  "escalationRisk": "low|medium|high",
  "escalationReasons": ["reason1", "reason2", ...],
  "satisfactionPrediction": "satisfied|neutral|dissatisfied",
  "complianceFlags": ["flag1", "flag2", ...],
  "callDisposition": "Brief outcome of the call"
}

Rules:
- Return ONLY the JSON object, nothing else
- All arrays can be empty [] if not applicable
- sentimentScore: 0.0 = very negative, 0.5 = neutral, 1.0 = very positive`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`)
  }

  const result = await response.json()
  const content = result.content?.[0]?.text || ''

  // Parse JSON from response
  const analysis = JSON.parse(content.trim())

  return analysis
}
