import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/webhook/test-clouducm
 * Temporary test endpoint to see if CloudUCM is sending webhooks
 * NO AUTHENTICATION - for debugging only
 * Writes received webhooks to test_webhook_logs table
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    // Log all headers
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Get raw body
    const body = await request.json()

    // Log everything to console
    console.log('='.repeat(80))
    console.log('TEST WEBHOOK RECEIVED FROM CLOUDUCM')
    console.log('='.repeat(80))
    console.log('Headers:', JSON.stringify(headers, null, 2))
    console.log('Body:', JSON.stringify(body, null, 2))
    console.log('='.repeat(80))

    // Store in database for debugging (best effort - don't fail if table doesn't exist)
    try {
      await supabase.from('test_webhook_logs').insert({
        headers: headers,
        body: body,
        received_at: new Date().toISOString(),
      })
    } catch (dbError) {
      console.log('Note: Could not write to test_webhook_logs table (may not exist):', dbError)
    }

    // Also try to create a CDR record if it looks like valid webhook data
    if (body.uniqueid && body.src && body.dst) {
      console.log('Looks like valid CDR data, attempting to create record...')

      const ACME_TENANT_ID = '038bf86c-19a0-4f0c-a061-c99b243d8018'
      const ACME_CONNECTION_ID = 'e2d7e69b-9179-4824-b21c-53249f63fdc2'

      const { data: cdr, error: cdrError } = await supabase
        .from('cdr_records')
        .insert({
          tenant_id: ACME_TENANT_ID,
          pbx_connection_id: ACME_CONNECTION_ID,
          uniqueid: body.uniqueid,
          linkedid: body.linkedid || body.uniqueid,
          src: body.src,
          dst: body.dst,
          call_direction: 'inbound',
          start_time: body.start || new Date().toISOString(),
          duration_seconds: body.duration || 0,
          disposition: body.disposition || 'UNKNOWN',
          recording_filename: body.recording_filename,
          processing_status: 'pending',
          raw_webhook_payload: body,
        })
        .select()
        .single()

      if (cdrError) {
        console.error('Failed to create CDR:', cdrError)
      } else {
        console.log('Created test CDR:', cdr.id)

        // Create job if there's a recording
        if (body.recording_filename) {
          await supabase.from('job_queue').insert({
            tenant_id: ACME_TENANT_ID,
            cdr_record_id: cdr.id,
            job_type: 'full_pipeline',
            status: 'pending',
            priority: 0,
            scheduled_for: new Date().toISOString(),
          })
        }
      }
    }

    return NextResponse.json(
      {
        message: 'Test webhook received successfully',
        timestamp: new Date().toISOString(),
        received: true,
        hasValidCdrData: !!(body.uniqueid && body.src && body.dst),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process test webhook',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
