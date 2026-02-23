import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth'
import { createError, RESOURCE_ERRORS, VALIDATION_ERRORS } from '@/lib/errors'
import { CreateUserSchema, ListUsersQuerySchema } from '@/lib/validations/users'

// GET /api/admin/users - List all users (super_admin only, paginated)
export async function GET(request: NextRequest) {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    // Validate query parameters
    const queryResult = ListUsersQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      tenant_id: searchParams.get('tenant_id'),
      role: searchParams.get('role'),
      is_active: searchParams.get('is_active'),
    })

    if (!queryResult.success) {
      createError(VALIDATION_ERRORS.INVALID_INPUT, queryResult.error.errors[0].message)
    }

    const { page, limit, tenant_id, role, is_active } = queryResult.data
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('users')
      .select(`
        *,
        tenants (
          name,
          slug
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }

    if (role) {
      query = query.eq('role', role)
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: users, error, count } = await query

    if (error) {
      console.error('Database error fetching users:', error)
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

// POST /api/admin/users - Create a new user (super_admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const supabase = await createClient()
    const body = await request.json()

    // Validate request body
    const validationResult = CreateUserSchema.safeParse(body)

    if (!validationResult.success) {
      createError(
        VALIDATION_ERRORS.INVALID_INPUT,
        validationResult.error.errors[0].message
      )
    }

    const userData = validationResult.data

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, status')
      .eq('id', userData.tenant_id)
      .single()

    if (tenantError || !tenant) {
      createError(
        RESOURCE_ERRORS.NOT_FOUND,
        `Tenant with ID "${userData.tenant_id}" not found`
      )
    }

    if (tenant.status !== 'active') {
      createError(
        VALIDATION_ERRORS.INVALID_INPUT,
        'Cannot create user for inactive tenant'
      )
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single()

    if (existingUser) {
      createError(
        RESOURCE_ERRORS.ALREADY_EXISTS,
        `User with email "${userData.email}" already exists`
      )
    }

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: userData.full_name,
        tenant_id: userData.tenant_id,
        role: userData.role,
      },
    })

    if (authError || !authUser.user) {
      console.error('Auth error creating user:', authError)
      createError(
        VALIDATION_ERRORS.INVALID_INPUT,
        authError?.message || 'Failed to create auth user'
      )
    }

    // Create user in app database
    const { data: newUser, error: dbError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        tenant_id: userData.tenant_id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        is_active: true,
        timezone: userData.timezone,
        email_notifications_enabled: userData.email_notifications_enabled,
        metadata: userData.metadata,
      } as never)
      .select(`
        *,
        tenants (
          name,
          slug
        )
      `)
      .single()

    if (dbError) {
      console.error('Database error creating user:', dbError)

      // Rollback: delete auth user if database insert fails
      await supabase.auth.admin.deleteUser(authUser.user.id)

      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to create user')
    }

    return NextResponse.json(newUser, { status: 201 })
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
