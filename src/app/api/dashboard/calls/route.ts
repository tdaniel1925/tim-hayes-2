import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth, getCurrentTenantId } from '@/lib/auth'
import { createError, VALIDATION_ERRORS } from '@/lib/errors'
import { ListCallsQuerySchema } from '@/lib/validations/calls'

// GET /api/dashboard/calls - List calls for current tenant (paginated, filtered)
export async function GET(request: NextRequest) {
  try {
    // Verify authentication and get tenant ID
    await verifyAuth(['tenant_admin', 'manager', 'viewer', 'super_admin'])
    const tenantId = await getCurrentTenantId()

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    // Validate query parameters
    const queryResult = ListCallsQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      disposition: searchParams.get('disposition'),
      direction: searchParams.get('direction'),
      status: searchParams.get('status'),
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date'),
      search: searchParams.get('search'),
    })

    if (!queryResult.success) {
      createError(VALIDATION_ERRORS.INVALID_INPUT, queryResult.error.errors[0].message)
    }

    const { page, limit, disposition, direction, status, start_date, end_date, search } =
      queryResult.data
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('cdr_records')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: false })

    // Apply filters
    if (disposition) {
      query = query.eq('disposition', disposition)
    }

    if (direction) {
      query = query.eq('call_direction', direction)
    }

    if (status) {
      query = query.eq('processing_status', status)
    }

    if (start_date) {
      query = query.gte('start_time', start_date)
    }

    if (end_date) {
      query = query.lte('start_time', end_date)
    }

    if (search) {
      // Search by phone number (src or dst)
      query = query.or(`src.ilike.%${search}%,dst.ilike.%${search}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: calls, error, count } = await query

    if (error) {
      console.error('Database error fetching calls:', error)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to fetch calls')
    }

    return NextResponse.json({
      data: calls || [],
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

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
