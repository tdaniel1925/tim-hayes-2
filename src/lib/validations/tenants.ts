import { z } from 'zod'

// Tenant status enum
export const TenantStatusSchema = z.enum(['active', 'suspended', 'cancelled'])

// Tenant billing plan enum
export const BillingPlanSchema = z.enum([
  'free',
  'starter',
  'professional',
  'enterprise',
])

// Create tenant schema (POST /api/tenants)
export const CreateTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  billing_email: z.string().email('Invalid email address').optional().nullable(),
  billing_plan: BillingPlanSchema.optional().default('free'),
  recording_retention_days: z
    .number()
    .int('Retention days must be an integer')
    .min(1, 'Retention days must be at least 1')
    .max(365, 'Retention days cannot exceed 365')
    .optional()
    .default(90),
  ai_custom_keywords: z.array(z.string()).optional().default([]),
  metadata: z.record(z.unknown()).optional().default({}),
})

// Update tenant schema (PATCH /api/tenants/[id])
export const UpdateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  status: TenantStatusSchema.optional(),
  billing_email: z.string().email().optional().nullable(),
  billing_plan: BillingPlanSchema.optional(),
  recording_retention_days: z.number().int().min(1).max(365).optional(),
  ai_custom_keywords: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
})

// List tenants query parameters schema (GET /api/tenants)
export const ListTenantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: TenantStatusSchema.optional(),
  search: z.string().optional(),
})

// Types inferred from schemas
export type CreateTenantInput = z.infer<typeof CreateTenantSchema>
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>
export type ListTenantsQuery = z.infer<typeof ListTenantsQuerySchema>
