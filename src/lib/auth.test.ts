import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyAuth, isSuperAdmin, canAccessTenant, getCurrentUser, getCurrentTenantId } from './auth'
import { AppError, AUTH_ERRORS } from './errors'

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('Auth - verifyAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should throw SESSION_EXPIRED (401) when no session exists', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('No session'),
        }),
      },
    } as any)

    await expect(verifyAuth()).rejects.toThrow(AppError)
    await expect(verifyAuth()).rejects.toThrow(
      expect.objectContaining({
        code: AUTH_ERRORS.SESSION_EXPIRED,
        statusCode: 401,
      })
    )
  })

  it('should throw USER_NOT_FOUND (401) when user does not exist in users table', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('User not found'),
            }),
          }),
        }),
      }),
    } as any)

    await expect(verifyAuth()).rejects.toThrow(AppError)
    await expect(verifyAuth()).rejects.toThrow(
      expect.objectContaining({
        code: AUTH_ERRORS.USER_NOT_FOUND,
        statusCode: 401,
      })
    )
  })

  it('should throw ACCOUNT_SUSPENDED (403) when user is inactive', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-user-id',
                email: 'test@example.com',
                role: 'tenant_admin',
                tenant_id: 'tenant-123',
                full_name: 'Test User',
                is_active: false, // INACTIVE USER
              },
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    await expect(verifyAuth()).rejects.toThrow(AppError)
    await expect(verifyAuth()).rejects.toThrow(
      expect.objectContaining({
        code: AUTH_ERRORS.ACCOUNT_SUSPENDED,
        statusCode: 403,
      })
    )
  })

  it('should throw INSUFFICIENT_PERMISSIONS (403) when user role is not allowed', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-user-id',
                email: 'test@example.com',
                role: 'viewer', // Not in allowed roles
                tenant_id: 'tenant-123',
                full_name: 'Test User',
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    await expect(verifyAuth(['super_admin', 'tenant_admin'])).rejects.toThrow(AppError)
    await expect(verifyAuth(['super_admin', 'tenant_admin'])).rejects.toThrow(
      expect.objectContaining({
        code: AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
        statusCode: 403,
      })
    )
  })

  it('should return user object when authenticated and active', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'tenant_admin' as const,
      tenant_id: 'tenant-123',
      full_name: 'Test User',
      is_active: true,
    }

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const result = await verifyAuth()

    expect(result).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      tenantId: mockUser.tenant_id,
      fullName: mockUser.full_name,
      isActive: mockUser.is_active,
    })
  })

  it('should allow super_admin role when required', async () => {
    const mockUser = {
      id: 'super-admin-id',
      email: 'admin@audiapro.com',
      role: 'super_admin' as const,
      tenant_id: null,
      full_name: 'Super Admin',
      is_active: true,
    }

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'super-admin-id' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const result = await verifyAuth(['super_admin'])

    expect(result.role).toBe('super_admin')
    expect(result.tenantId).toBeNull()
  })

  it('should return user when no role restrictions are specified', async () => {
    const mockUser = {
      id: 'viewer-id',
      email: 'viewer@example.com',
      role: 'viewer' as const,
      tenant_id: 'tenant-123',
      full_name: 'Viewer User',
      is_active: true,
    }

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'viewer-id' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const result = await verifyAuth() // No role restrictions

    expect(result.role).toBe('viewer')
  })
})

describe('Auth - Helper Functions', () => {
  it('isSuperAdmin should return true for super_admin', async () => {
    const mockUser = {
      id: 'super-admin-id',
      email: 'admin@audiapro.com',
      role: 'super_admin' as const,
      tenant_id: null,
      full_name: 'Super Admin',
      is_active: true,
    }

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'super-admin-id' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const result = await isSuperAdmin()
    expect(result).toBe(true)
  })

  it('isSuperAdmin should return false for non-super_admin', async () => {
    const mockUser = {
      id: 'tenant-admin-id',
      email: 'admin@tenant.com',
      role: 'tenant_admin' as const,
      tenant_id: 'tenant-123',
      full_name: 'Tenant Admin',
      is_active: true,
    }

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'tenant-admin-id' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const result = await isSuperAdmin()
    expect(result).toBe(false)
  })
})
