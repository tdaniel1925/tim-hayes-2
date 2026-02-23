import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth'
import { createError, VALIDATION_ERRORS } from '@/lib/errors'

// GET /api/admin/stats - Get system-wide statistics (super_admin only)
export async function GET() {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const supabase = await createClient()

    // Get tenant count
    const { count: tenantCount, error: tenantError } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (tenantError) {
      console.error('Error fetching tenant count:', tenantError)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to fetch stats')
    }

    // Get active connection count
    const { count: connectionCount, error: connectionError } = await supabase
      .from('pbx_connections')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (connectionError) {
      console.error('Error fetching connection count:', connectionError)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to fetch stats')
    }

    // Get job queue status counts
    const { data: jobData, error: jobError } = await supabase
      .from('job_queue')
      .select('status')

    if (jobError) {
      console.error('Error fetching job queue data:', jobError)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to fetch stats')
    }

    const jobQueueStatus = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    }

    if (jobData) {
      jobData.forEach((job) => {
        const status = job.status
        if (status && status in jobQueueStatus) {
          jobQueueStatus[status as keyof typeof jobQueueStatus]++
        }
      })
    }

    // Get calls today (system-wide)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const { count: callsToday, error: todayError } = await supabase
      .from('cdr_records')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', todayStart.toISOString())

    if (todayError) {
      console.error('Error fetching calls today:', todayError)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to fetch stats')
    }

    return NextResponse.json({
      tenantCount: tenantCount || 0,
      connectionCount: connectionCount || 0,
      callsToday: callsToday || 0,
      jobQueueStatus,
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
