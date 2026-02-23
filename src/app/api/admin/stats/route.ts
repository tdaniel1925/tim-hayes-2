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

    // Get total tenants count
    const { count: totalTenants, error: tenantError } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })

    if (tenantError) {
      console.error('Error fetching tenant count:', tenantError)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to fetch stats')
    }

    // Get active tenants count
    const { count: activeTenants, error: activeTenantsError } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (activeTenantsError) {
      console.error('Error fetching active tenants count:', activeTenantsError)
    }

    // Get total connections count
    const { count: totalConnections, error: connectionError } = await supabase
      .from('pbx_connections')
      .select('*', { count: 'exact', head: true })

    if (connectionError) {
      console.error('Error fetching connections count:', connectionError)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to fetch stats')
    }

    // Get active connections count
    const { count: activeConnections, error: activeConnectionsError } = await supabase
      .from('pbx_connections')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'connected')

    if (activeConnectionsError) {
      console.error('Error fetching active connections count:', activeConnectionsError)
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

    // Get recent activity (last 10 jobs)
    const { data: recentJobs, error: recentJobsError } = await supabase
      .from('job_queue')
      .select(`
        id,
        job_type,
        status,
        created_at,
        tenants(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentJobsError) {
      console.error('Error fetching recent jobs:', recentJobsError)
    }

    // Get total calls count
    const { count: totalCalls, error: totalCallsError } = await supabase
      .from('cdr_records')
      .select('*', { count: 'exact', head: true })

    if (totalCallsError) {
      console.error('Error fetching total calls count:', totalCallsError)
    }

    return NextResponse.json({
      tenants: {
        total: totalTenants || 0,
        active: activeTenants || 0,
      },
      connections: {
        total: totalConnections || 0,
        active: activeConnections || 0,
      },
      calls: {
        today: callsToday || 0,
        total: totalCalls || 0,
      },
      jobs: jobQueueStatus,
      recentActivity: recentJobs || [],
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
