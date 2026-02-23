import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth'
import { createError, RESOURCE_ERRORS, VALIDATION_ERRORS } from '@/lib/errors'
import { UpdateTenantSchema } from '@/lib/validations/tenants'
import type { Json } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/tenants/[id] - Get tenant detail (super_admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const { id } = await params
    const supabase = await createClient()

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !tenant) {
      createError(RESOURCE_ERRORS.NOT_FOUND, 'Tenant not found')
    }

    return NextResponse.json(tenant)
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

// PATCH /api/tenants/[id] - Update tenant (super_admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Validate request body
    const validationResult = UpdateTenantSchema.safeParse(body)

    if (!validationResult.success) {
      createError(
        VALIDATION_ERRORS.INVALID_INPUT,
        validationResult.error.errors[0].message
      )
    }

    const updateData = validationResult.data

    // Check if tenant exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingTenant) {
      createError(RESOURCE_ERRORS.NOT_FOUND, 'Tenant not found')
    }

    // If slug is being updated, check if it's unique
    if (updateData.slug) {
      const { data: slugConflict } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', updateData.slug)
        .neq('id', id)
        .single()

      if (slugConflict) {
        createError(
          RESOURCE_ERRORS.ALREADY_EXISTS,
          `Tenant with slug "${updateData.slug}" already exists`
        )
      }
    }

    // Update tenant (cast metadata to Json type)
    const { data: updatedTenant, error } = await supabase
      .from('tenants')
      .update({
        ...updateData,
        metadata: updateData.metadata as Json | undefined,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error updating tenant:', error)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to update tenant')
    }

    return NextResponse.json(updatedTenant)
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
