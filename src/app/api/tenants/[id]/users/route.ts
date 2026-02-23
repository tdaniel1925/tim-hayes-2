import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth'
import { createError, RESOURCE_ERRORS, VALIDATION_ERRORS } from '@/lib/errors'
import { z } from 'zod'

// Query parameters schema
const ListTenantUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  is_active: z.coerce.boolean().optional(),
})

// GET /api/tenants/[id]/users - List all users for a tenant (super_admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const { id } = await params
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, status')
      .eq('id', id)
      .single()

    if (tenantError || !tenant) {
      createError(RESOURCE_ERRORS.NOT_FOUND, 'Tenant not found')
    }

    // Validate query parameters
    const queryResult = ListTenantUsersQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      is_active: searchParams.get('is_active'),
    })

    if (!queryResult.success) {
      createError(VALIDATION_ERRORS.INVALID_INPUT, queryResult.error.errors[0].message)
    }

    const { page, limit, is_active } = queryResult.data
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: users, error, count } = await query

    if (error) {
      console.error('Database error fetching tenant users:', error)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to fetch users')
    }

    return NextResponse.json({
      data: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
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
