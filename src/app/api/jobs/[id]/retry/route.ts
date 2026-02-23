import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth'
import { createError, SYSTEM_ERRORS, RESOURCE_ERRORS, VALIDATION_ERRORS } from '@/lib/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(['super_admin'])
    const supabase = await createClient()

    const { id } = await params

    // Fetch the job to ensure it exists and is in failed state
    const { data: job, error: fetchError } = await supabase
      .from('job_queue')
      .select('id, status, attempts, max_attempts')
      .eq('id', id)
      .single()

    if (fetchError || !job) {
      createError(RESOURCE_ERRORS.NOT_FOUND, 'Job not found')
    }

    // Only allow retry on failed jobs
    if (job.status !== 'failed') {
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Can only retry failed jobs')
    }

    // Reset job to pending state
    const { data, error } = await supabase
      .from('job_queue')
      .update({
        status: 'pending',
        error: null,
        scheduled_for: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error retrying job:', error)
      createError(SYSTEM_ERRORS.DATABASE_ERROR, 'Failed to retry job')
    }

    return NextResponse.json({ data })
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

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
