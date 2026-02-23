import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth, canAccessTenant } from '@/lib/auth'
import { createError, RESOURCE_ERRORS } from '@/lib/errors'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/dashboard/calls/[id] - Get call detail with analysis and signed URLs
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify authentication
    await verifyAuth(['tenant_admin', 'manager', 'viewer', 'super_admin'])

    const { id } = await params
    const supabase = await createClient()

    // Get CDR record
    const { data: call, error: callError } = await supabase
      .from('cdr_records')
      .select('*')
      .eq('id', id)
      .single()

    if (callError || !call) {
      createError(RESOURCE_ERRORS.NOT_FOUND, 'Call not found')
    }

    // Check if user can access this tenant's data
    const hasAccess = await canAccessTenant(call.tenant_id)
    if (!hasAccess) {
      createError(RESOURCE_ERRORS.NOT_FOUND, 'Call not found')
    }

    // Get analysis if available
    const { data: analysis } = await supabase
      .from('call_analyses')
      .select('*')
      .eq('cdr_record_id', id)
      .single()

    // Generate signed URLs for storage files (1 hour expiry)
    const signedUrls: {
      recording?: string
      transcript?: string
      analysis?: string
    } = {}

    // Recording URL
    if (call.recording_storage_path) {
      const { data: recordingUrl } = await supabase.storage
        .from('call-recordings')
        .createSignedUrl(call.recording_storage_path, 3600) // 1 hour

      if (recordingUrl) {
        signedUrls.recording = recordingUrl.signedUrl
      }
    }

    // Transcript URL
    if (call.transcript_storage_path) {
      const { data: transcriptUrl } = await supabase.storage
        .from('call-transcripts')
        .createSignedUrl(call.transcript_storage_path, 3600)

      if (transcriptUrl) {
        signedUrls.transcript = transcriptUrl.signedUrl
      }
    }

    // Analysis URL
    if (call.analysis_storage_path) {
      const { data: analysisUrl } = await supabase.storage
        .from('call-analyses')
        .createSignedUrl(call.analysis_storage_path, 3600)

      if (analysisUrl) {
        signedUrls.analysis = analysisUrl.signedUrl
      }
    }

    // Return call detail with analysis and signed URLs
    return NextResponse.json({
      call,
      analysis,
      signedUrls,
    })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json(
        {
          error: error.message,
          code: (error as { code?: string }).code,
        },
        { status: (error as { statusCode: number }).statusCode }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
