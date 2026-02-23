import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth'
import { createError, SYSTEM_ERRORS } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(['super_admin'])
    const supabase = await createClient()

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const statusFilter = searchParams.get('status') // pending, processing, completed, failed
    const tenantFilter = searchParams.get('tenant_id')

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      )
    }

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('job_queue')
      .select(`
        id,
        tenant_id,
        tenants(name),
        cdr_record_id,
        job_type,
        status,
        priority,
        attempts,
        max_attempts,
        scheduled_for,
        started_at,
        completed_at,
        error,
        created_at,
        updated_at
      `, { count: 'exact' })

    // Apply filters
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }
    if (tenantFilter) {
      query = query.eq('tenant_id', tenantFilter)
    }

    // Apply pagination and sorting
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Database error fetching jobs:', error)
      createError(SYSTEM_ERRORS.DATABASE_ERROR, 'Failed to fetch jobs')
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
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

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
