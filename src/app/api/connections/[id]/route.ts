import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth'
import { createError, RESOURCE_ERRORS, VALIDATION_ERRORS } from '@/lib/errors'
import { encrypt } from '@/lib/encryption'
import { UpdateConnectionSchema } from '@/lib/validations/connections'
import type { Json } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/connections/[id] - Get connection detail (super_admin only)
// NEVER returns password_encrypted
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const { id } = await params
    const supabase = await createClient()

    const { data: connection, error } = await supabase
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
      `
      )
      .eq('id', id)
      .single()

    if (error || !connection) {
      createError(RESOURCE_ERRORS.NOT_FOUND, 'Connection not found')
    }

    return NextResponse.json(connection)
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

// PATCH /api/connections/[id] - Update connection (super_admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Validate request body
    const validationResult = UpdateConnectionSchema.safeParse(body)

    if (!validationResult.success) {
      createError(VALIDATION_ERRORS.INVALID_INPUT, validationResult.error.errors[0].message)
    }

    const updateData = validationResult.data

    // Check if connection exists
    const { data: existingConnection } = await supabase
      .from('pbx_connections')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingConnection) {
      createError(RESOURCE_ERRORS.NOT_FOUND, 'Connection not found')
    }

    // Prepare update object - explicitly build it to avoid type issues
    const updateObject: {
      name?: string
      connection_type?: string
      host?: string
      port?: number
      username?: string
      password_encrypted?: string
      verify_ssl?: boolean
      status?: string
      metadata?: Json
    } = {}

    if (updateData.name !== undefined) updateObject.name = updateData.name
    if (updateData.connection_type !== undefined)
      updateObject.connection_type = updateData.connection_type
    if (updateData.host !== undefined) updateObject.host = updateData.host
    if (updateData.port !== undefined) updateObject.port = updateData.port
    if (updateData.username !== undefined) updateObject.username = updateData.username
    if (updateData.verify_ssl !== undefined) updateObject.verify_ssl = updateData.verify_ssl
    if (updateData.status !== undefined) updateObject.status = updateData.status
    if (updateData.metadata !== undefined) updateObject.metadata = updateData.metadata as Json

    // If password is being updated, encrypt it
    if (updateData.password) {
      try {
        updateObject.password_encrypted = encrypt(updateData.password)
      } catch (error) {
        console.error('Encryption error:', error)
        createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to encrypt password')
      }
    }

    // Update connection
    const { data: updatedConnection, error } = await supabase
      .from('pbx_connections')
      .update(updateObject)
      .eq('id', id)
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
      console.error('Database error updating connection:', error)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to update connection')
    }

    return NextResponse.json(updatedConnection)
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

// DELETE /api/connections/[id] - Soft delete connection (super_admin only)
// Sets status to 'inactive' instead of actually deleting
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const { id } = await params
    const supabase = await createClient()

    // Check if connection exists
    const { data: existingConnection } = await supabase
      .from('pbx_connections')
      .select('id, status')
      .eq('id', id)
      .single()

    if (!existingConnection) {
      createError(RESOURCE_ERRORS.NOT_FOUND, 'Connection not found')
    }

    // Soft delete: set status to inactive
    const { data: deletedConnection, error } = await supabase
      .from('pbx_connections')
      .update({ status: 'inactive' })
      .eq('id', id)
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
      console.error('Database error deleting connection:', error)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to delete connection')
    }

    return NextResponse.json({
      message: 'Connection deactivated successfully',
      connection: deletedConnection,
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
