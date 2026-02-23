import { createClient } from '@/lib/supabase/server'
import { createError, AUTH_ERRORS } from '@/lib/errors'
import type { Database } from '@/lib/supabase/types'

type UserRole = Database['public']['Tables']['users']['Row']['role']

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  tenantId: string | null
  tenantName: string | null
  fullName: string | null
  isActive: boolean
}

/**
 * Verify authentication and authorization
 * IMPORTANT: This function THROWS errors, it never returns error objects
 *
 * @param allowedRoles - Array of roles that are allowed to access the resource
 * @returns AuthUser object with user details
 * @throws AppError with appropriate status code (401, 403)
 */
export async function verifyAuth(allowedRoles?: UserRole[]): Promise<AuthUser> {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    createError(AUTH_ERRORS.SESSION_EXPIRED)
  }

  // Get user details from our users table with tenant name
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, role, tenant_id, full_name, is_active, tenants(name)')
    .eq('id', authUser.id)
    .single()

  if (userError || !user) {
    createError(AUTH_ERRORS.USER_NOT_FOUND)
  }

  // Check if user is active
  if (!user.is_active) {
    createError(AUTH_ERRORS.ACCOUNT_SUSPENDED)
  }

  // Check if user has required role (if specified)
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      createError(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS)
    }
  }

  // Extract tenant name from the joined data
  const tenantName =
    user.tenants && typeof user.tenants === 'object' && 'name' in user.tenants
      ? (user.tenants.name as string)
      : null

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenant_id,
    tenantName,
    fullName: user.full_name,
    isActive: user.is_active,
  }
}

/**
 * Check if current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const user = await verifyAuth(['super_admin'])
    return user.role === 'super_admin'
  } catch {
    return false
  }
}

/**
 * Check if current user can access a specific tenant's data
 */
export async function canAccessTenant(tenantId: string): Promise<boolean> {
  try {
    const user = await verifyAuth()

    // Super admins can access all tenants
    if (user.role === 'super_admin') {
      return true
    }

    // Other users can only access their own tenant
    return user.tenantId === tenantId
  } catch {
    return false
  }
}

/**
 * Get current authenticated user (throws if not authenticated)
 */
export async function getCurrentUser(): Promise<AuthUser> {
  return verifyAuth()
}

/**
 * Get current user's tenant ID (throws if not authenticated or no tenant)
 */
export async function getCurrentTenantId(): Promise<string> {
  const user = await verifyAuth()

  if (!user.tenantId) {
    createError(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS, 'User does not belong to a tenant')
  }

  return user.tenantId
}
