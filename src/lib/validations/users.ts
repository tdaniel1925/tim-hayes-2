import { z } from 'zod'

// User role enum
export const UserRoleSchema = z.enum(['super_admin', 'tenant_admin', 'manager', 'viewer'])

// Create user schema (POST /api/admin/users)
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
  full_name: z.string().min(1, 'Full name is required').max(255, 'Full name must be less than 255 characters'),
  tenant_id: z.string().uuid('Invalid tenant ID'),
  role: UserRoleSchema.default('tenant_admin'),
  timezone: z.string().optional().default('UTC'),
  email_notifications_enabled: z.boolean().optional().default(true),
  metadata: z.record(z.unknown()).optional().default({}),
})

// Update user schema (PATCH /api/admin/users/[id])
export const UpdateUserSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  role: UserRoleSchema.optional(),
  is_active: z.boolean().optional(),
  timezone: z.string().optional(),
  email_notifications_enabled: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
})

// List users query parameters schema
export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  tenant_id: z.string().uuid().optional(),
  role: UserRoleSchema.optional(),
  is_active: z.coerce.boolean().optional(),
})

// Types inferred from schemas
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>
