import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth'
import { createError, RESOURCE_ERRORS, INTEGRATION_ERRORS } from '@/lib/errors'
import { decrypt } from '@/lib/encryption'
import { testGrandstreamConnection } from '@/lib/integrations/grandstream'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/connections/[id]/test - Test PBX connection (super_admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const { id } = await params
    const supabase = await createClient()

    // Get connection with encrypted password (we need it to test)
    const { data: connection, error } = await supabase
      .from('pbx_connections')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !connection) {
      createError(RESOURCE_ERRORS.NOT_FOUND, 'Connection not found')
    }

    // Decrypt password
    let decryptedPassword: string
    try {
      decryptedPassword = decrypt(connection.password_encrypted)
    } catch (error) {
      console.error('Decryption error:', error)
      createError(INTEGRATION_ERRORS.PBX_CONNECTION_FAILED, 'Failed to decrypt password')
    }

    // Test connection with 10 second timeout
    const testResult = await testGrandstreamConnection(
      {
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: decryptedPassword,
        verifySsl: connection.verify_ssl ?? false,
      },
      10000 // 10 second timeout
    )

    // Update connection status based on test result
    const updateData: {
      last_connected_at?: string
      last_error?: string | null
      status?: string
    } = {}

    if (testResult.success) {
      updateData.last_connected_at = new Date().toISOString()
      updateData.last_error = null
      updateData.status = 'active'
    } else {
      updateData.last_error = testResult.error || testResult.message
      updateData.status = 'error'
    }

    // Update connection in database
    await supabase.from('pbx_connections').update(updateData).eq('id', id)

    // Return test result (without any password info)
    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      error: testResult.error,
      responseTime: testResult.responseTime,
      connection: {
        id: connection.id,
        name: connection.name,
        host: connection.host,
        port: connection.port,
        status: updateData.status || connection.status,
        last_connected_at: updateData.last_connected_at || connection.last_connected_at,
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
