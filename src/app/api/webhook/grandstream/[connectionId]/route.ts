import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  GrandstreamWebhookSchema,
  determineCallDirection,
  parseWebhookDate,
} from '@/lib/validations/webhook'

interface RouteParams {
  params: Promise<{ connectionId: string }>
}

/**
 * POST /api/webhook/grandstream/[connectionId]
 * Webhook handler for Grandstream UCM CDR events
 *
 * IMPORTANT: Uses service role to bypass RLS
 * This endpoint is called by external PBX systems
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { connectionId } = await params

    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    // Step 1: Validate connection exists and get webhook secret
    const { data: connection, error: connectionError } = await supabase
      .from('pbx_connections')
      .select('id, tenant_id, webhook_secret, status')
      .eq('id', connectionId)
      .single()

    if (connectionError || !connection) {
      console.error(`Webhook: Connection ${connectionId} not found`)
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    // Step 2: Verify webhook secret
    const providedSecret = request.headers.get('x-webhook-secret')
    if (!providedSecret || providedSecret !== connection.webhook_secret) {
      console.error(
        `Webhook: Invalid secret for connection ${connectionId}`,
        `Expected: ${connection.webhook_secret.substring(0, 8)}...`,
        `Received: ${providedSecret?.substring(0, 8) || 'none'}...`
      )
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
    }

    // Step 3: Parse and validate payload
    const body = await request.json()

    const validationResult = GrandstreamWebhookSchema.safeParse(body)

    if (!validationResult.success) {
      console.error('Webhook: Invalid payload', validationResult.error.errors)
      return NextResponse.json(
        {
          error: 'Invalid payload',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const payload = validationResult.data

    // Step 4: Check for duplicate by uniqueid
    const { data: existingCdr } = await supabase
      .from('cdr_records')
      .select('id')
      .eq('uniqueid', payload.uniqueid)
      .eq('tenant_id', connection.tenant_id)
      .single()

    if (existingCdr) {
      console.log(
        `Webhook: Duplicate call detected (uniqueid: ${payload.uniqueid}), returning existing CDR ${existingCdr.id}`
      )
      return NextResponse.json(
        {
          message: 'Call already processed',
          cdr_id: existingCdr.id,
          duplicate: true,
        },
        { status: 200 }
      )
    }

    // Step 5: Determine call direction
    const callDirection = determineCallDirection(payload)

    // Step 6: Parse dates
    const startTime = parseWebhookDate(payload.start)
    const answerTime = parseWebhookDate(payload.answer)
    const endTime = parseWebhookDate(payload.end)

    // Step 7: Create CDR record
    const { data: cdrRecord, error: cdrError } = await supabase
      .from('cdr_records')
      .insert({
        tenant_id: connection.tenant_id,
        pbx_connection_id: connection.id,

        // Call identifiers
        uniqueid: payload.uniqueid,
        linkedid: payload.linkedid,
        session: payload.session,
        callid: payload.callid,

        // Call details
        src: payload.src,
        dst: payload.dst,
        call_direction: callDirection,
        dcontext: payload.dcontext,
        channel: payload.channel,
        dstchannel: payload.dstchannel,

        // Timing
        start_time: startTime?.toISOString(),
        answer_time: answerTime?.toISOString(),
        end_time: endTime?.toISOString(),
        duration_seconds: payload.duration,
        billsec_seconds: payload.billsec,

        // Status
        disposition: payload.disposition,
        amaflags: payload.amaflags,

        // Recording
        recording_filename: payload.recording_filename,

        // Grandstream-specific fields
        lastapp: payload.lastapp,
        lastdata: payload.lastdata,
        accountcode: payload.accountcode,
        userfield: payload.userfield,
        did: payload.did,
        outbound_cnum: payload.outbound_cnum,
        outbound_cnam: payload.outbound_cnam,
        dst_cnam: payload.dst_cnam,
        peeraccount: payload.peeraccount,
        sequence: payload.sequence,
        src_trunk_name: payload.src_trunk_name,
        dst_trunk_name: payload.dst_trunk_name,
        clid: payload.clid,

        // Processing status
        processing_status: 'pending',

        // Store raw payload for debugging
        raw_webhook_payload: body,
      })
      .select()
      .single()

    if (cdrError) {
      console.error('Webhook: Failed to create CDR record', cdrError)
      return NextResponse.json(
        { error: 'Failed to create CDR record', details: cdrError.message },
        { status: 500 }
      )
    }

    // Step 8: Create job queue entry (only if there's a recording)
    let jobId: string | undefined

    if (payload.recording_filename) {
      const { data: job, error: jobError } = await supabase
        .from('job_queue')
        .insert({
          tenant_id: connection.tenant_id,
          cdr_record_id: cdrRecord.id,
          job_type: 'full_pipeline',
          status: 'pending',
          priority: 0,
          scheduled_for: new Date().toISOString(),
        })
        .select()
        .single()

      if (jobError) {
        console.error('Webhook: Failed to create job', jobError)
        // Don't fail the webhook if job creation fails
        // The CDR is still recorded
      } else {
        jobId = job.id
      }
    } else {
      console.log(
        `Webhook: No recording filename for call ${payload.uniqueid}, skipping job creation`
      )
    }

    // Step 9: Success response
    console.log(
      `Webhook: Successfully processed call ${payload.uniqueid}`,
      `CDR: ${cdrRecord.id}`,
      jobId ? `Job: ${jobId}` : 'No job (no recording)'
    )

    return NextResponse.json(
      {
        message: 'Webhook processed successfully',
        cdr_id: cdrRecord.id,
        job_id: jobId,
        call_direction: callDirection,
        has_recording: !!payload.recording_filename,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Webhook: Unhandled error', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
