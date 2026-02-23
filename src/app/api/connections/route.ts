import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth'
import { createError, RESOURCE_ERRORS, VALIDATION_ERRORS } from '@/lib/errors'
import { encrypt } from '@/lib/encryption'
import {
  CreateConnectionSchema,
  ListConnectionsQuerySchema,
} from '@/lib/validations/connections'
import { randomBytes } from 'crypto'
import type { Json } from '@/lib/supabase/types'

// GET /api/connections - List all connections (super_admin only, paginated)
export async function GET(request: NextRequest) {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    // Validate query parameters
    const queryResult = ListConnectionsQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      tenant_id: searchParams.get('tenant_id'),
      status: searchParams.get('status'),
      connection_type: searchParams.get('connection_type'),
    })

    if (!queryResult.success) {
      createError(VALIDATION_ERRORS.INVALID_INPUT, queryResult.error.errors[0].message)
    }

    const { page, limit, tenant_id, status, connection_type } = queryResult.data
    const offset = (page - 1) * limit

    // Build query - NEVER select password_encrypted
    let query = supabase
      .from('pbx_connections')
      .select(
        `
        id,
        tenant_id,
        name,
        connection_type,
        host,
        port,
        username,
        verify_ssl,
        webhook_secret,
        status,
        last_connected_at,
        last_error,
        created_at,
        updated_at,
        metadata
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    // Apply filters
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (connection_type) {
      query = query.eq('connection_type', connection_type)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: connections, error, count } = await query

    if (error) {
      console.error('Database error fetching connections:', error)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to fetch connections')
    }

    return NextResponse.json({
      data: connections || [],
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

// POST /api/connections - Create a new PBX connection (super_admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const supabase = await createClient()
    const body = await request.json()

    // Validate request body
    const validationResult = CreateConnectionSchema.safeParse(body)

    if (!validationResult.success) {
      createError(VALIDATION_ERRORS.INVALID_INPUT, validationResult.error.errors[0].message)
    }

    const connectionData = validationResult.data

    // Check if tenant exists
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', connectionData.tenant_id)
      .single()

    if (!tenant) {
      createError(RESOURCE_ERRORS.NOT_FOUND, 'Tenant not found')
    }

    // Encrypt password
    let encryptedPassword: string
    try {
      encryptedPassword = encrypt(connectionData.password)
    } catch (error) {
      console.error('Encryption error:', error)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to encrypt password')
    }

    // Generate webhook secret (32-byte hex)
    const webhookSecret = randomBytes(32).toString('hex')

    // Create connection
    const { data: newConnection, error } = await supabase
      .from('pbx_connections')
      .insert({
        tenant_id: connectionData.tenant_id,
        name: connectionData.name,
        connection_type: connectionData.connection_type,
        host: connectionData.host,
        port: connectionData.port,
        username: connectionData.username,
        password_encrypted: encryptedPassword,
        verify_ssl: connectionData.verify_ssl,
        webhook_secret: webhookSecret,
        metadata: connectionData.metadata as Json,
      })
      .select(
        `
        id,
        tenant_id,
        name,
        connection_type,
        host,
        port,
        username,
        verify_ssl,
        webhook_secret,
        status,
        last_connected_at,
        last_error,
        created_at,
        updated_at,
        metadata
      `
      )
      .single()

    if (error) {
      console.error('Database error creating connection:', error)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to create connection')
    }

    return NextResponse.json(newConnection, { status: 201 })
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
