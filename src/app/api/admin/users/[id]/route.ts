import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth'
import { createError, RESOURCE_ERRORS, VALIDATION_ERRORS } from '@/lib/errors'
import { UpdateUserSchema } from '@/lib/validations/users'

// GET /api/admin/users/[id] - Get user details (super_admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const { id } = await params
    const supabase = await createClient()

    // Fetch user with tenant info
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        tenants (
          id,
          name,
          slug,
          status
        )
      `)
      .eq('id', id)
      .single()

    if (error || !user) {
      createError(RESOURCE_ERRORS.NOT_FOUND, 'User not found')
    }

    return NextResponse.json(user)
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

// PATCH /api/admin/users/[id] - Update user (super_admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Validate request body
    const validationResult = UpdateUserSchema.safeParse(body)

    if (!validationResult.success) {
      createError(
        VALIDATION_ERRORS.INVALID_INPUT,
        validationResult.error.errors[0].message
      )
    }

    const updateData = validationResult.data

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', id)
      .single()

    if (fetchError || !existingUser) {
      createError(RESOURCE_ERRORS.NOT_FOUND, 'User not found')
    }

    // Prevent deactivating super_admin users
    if (existingUser.role === 'super_admin' && updateData.is_active === false) {
      createError(
        VALIDATION_ERRORS.INVALID_INPUT,
        'Cannot deactivate super admin users'
      )
    }

    // Build update object (exclude undefined values)
    const updateObject: Record<string, unknown> = {}
    if (updateData.full_name !== undefined) updateObject.full_name = updateData.full_name
    if (updateData.role !== undefined) updateObject.role = updateData.role
    if (updateData.is_active !== undefined) updateObject.is_active = updateData.is_active
    if (updateData.timezone !== undefined) updateObject.timezone = updateData.timezone
    if (updateData.email_notifications_enabled !== undefined) {
      updateObject.email_notifications_enabled = updateData.email_notifications_enabled
    }
    if (updateData.metadata !== undefined) updateObject.metadata = updateData.metadata

    // Update user in database
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateObject)
      .eq('id', id)
      .select(`
        *,
        tenants (
          name,
          slug
        )
      `)
      .single()

    if (updateError) {
      console.error('Database error updating user:', updateError)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to update user')
    }

    // If user was deactivated, revoke all sessions
    if (updateData.is_active === false) {
      try {
        await supabase.auth.admin.signOut(id)
      } catch (signOutError) {
        console.error('Error signing out user:', signOutError)
        // Don't fail the request if sign out fails
      }
    }

    return NextResponse.json(updatedUser)
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

// DELETE /api/admin/users/[id] - Delete user (super_admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify super admin access
    await verifyAuth(['super_admin'])

    const { id } = await params
    const supabase = await createClient()

    // Check if user exists and is not a super_admin
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', id)
      .single()

    if (fetchError || !existingUser) {
      createError(RESOURCE_ERRORS.NOT_FOUND, 'User not found')
    }

    // Prevent deleting super_admin users
    if (existingUser.role === 'super_admin') {
      createError(
        VALIDATION_ERRORS.INVALID_INPUT,
        'Cannot delete super admin users'
      )
    }

    // Delete user from auth (cascade will delete from users table)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(id)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to delete user')
    }

    return NextResponse.json({ success: true })
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
