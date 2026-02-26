import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth'
import { createError, RESOURCE_ERRORS, VALIDATION_ERRORS } from '@/lib/errors'
import {
  CreateTenantSchema,
  ListTenantsQuerySchema,
} from '@/lib/validations/tenants'
import type { Json } from '@/lib/supabase/types'
// GET /api/tenants - List all tenants (super_admin only, paginated)
export async function GET(request: NextRequest) {
  try {
    console.log('[GET /api/tenants] Request received')

    // Verify super admin access
    console.log('[GET /api/tenants] Verifying auth...')
    await verifyAuth(['super_admin'])
    console.log('[GET /api/tenants] Auth verified')

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    // Validate query parameters (convert null to undefined for optional fields)
    const queryResult = ListTenantsQuerySchema.safeParse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    })

    if (!queryResult.success) {
      const errorMsg = queryResult.error.errors[0].message
      console.error('Query validation failed:', errorMsg, queryResult.error.errors)
      return NextResponse.json(
        { error: errorMsg, code: VALIDATION_ERRORS.INVALID_INPUT },
        { status: 400 }
      )
    }

    const { page, limit, status, search } = queryResult.data
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('tenants')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: tenants, error, count } = await query

    if (error) {
      console.error('Database error fetching tenants:', error)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to fetch tenants')
    }

    return NextResponse.json({
      data: tenants || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('[GET /api/tenants] Error caught:', error)

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
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// POST /api/tenants - Create a new tenant (super_admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const supabase = await createClient()
    const body = await request.json()

    // Validate request body
    const validationResult = CreateTenantSchema.safeParse(body)

    if (!validationResult.success) {
      createError(
        VALIDATION_ERRORS.INVALID_INPUT,
        validationResult.error.errors[0].message
      )
    }

    const tenantData = validationResult.data

    // Check if slug already exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantData.slug)
      .single()

    if (existingTenant) {
      createError(
        RESOURCE_ERRORS.ALREADY_EXISTS,
        `Tenant with slug "${tenantData.slug}" already exists`
      )
    }

    // Create tenant (cast metadata to Json type)
    const { data: newTenant, error } = await supabase
      .from('tenants')
      .insert({
        name: tenantData.name,
        slug: tenantData.slug,
        billing_email: tenantData.billing_email || null,
        billing_plan: tenantData.billing_plan,
        recording_retention_days: tenantData.recording_retention_days,
        ai_custom_keywords: tenantData.ai_custom_keywords,
        metadata: tenantData.metadata as Json,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error creating tenant:', error)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to create tenant')
    }

    return NextResponse.json(newTenant, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tenants] Error caught:', error)

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
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
