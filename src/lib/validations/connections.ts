import { z } from 'zod'

// Connection type enum
export const ConnectionTypeSchema = z.enum(['grandstream', 'generic'])

// Connection status enum
export const ConnectionStatusSchema = z.enum(['active', 'inactive', 'error'])

// Create PBX connection schema (POST /api/connections)
export const CreateConnectionSchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant ID'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),
  connection_type: ConnectionTypeSchema.optional().default('grandstream'),
  host: z
    .string()
    .min(1, 'Host is required')
    .max(255, 'Host must be less than 255 characters'),
  port: z
    .number()
    .int('Port must be an integer')
    .min(1, 'Port must be at least 1')
    .max(65535, 'Port must be at most 65535')
    .optional()
    .default(8089),
  username: z
    .string()
    .min(1, 'Username is required')
    .max(255, 'Username must be less than 255 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(255, 'Password must be less than 255 characters'),
  verify_ssl: z.boolean().optional().default(false),
  metadata: z.record(z.unknown()).optional().default({}),
})

// Update PBX connection schema (PATCH /api/connections/[id])
export const UpdateConnectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  connection_type: ConnectionTypeSchema.optional(),
  host: z.string().min(1).max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  username: z.string().min(1).max(255).optional(),
  password: z.string().min(1).max(255).optional(), // Only if being changed
  verify_ssl: z.boolean().optional(),
  status: ConnectionStatusSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
})

// List connections query parameters schema (GET /api/connections)
export const ListConnectionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  tenant_id: z.string().uuid().optional(), // Filter by tenant
  status: ConnectionStatusSchema.optional(),
  connection_type: ConnectionTypeSchema.optional(),
})

// Types inferred from schemas
export type CreateConnectionInput = z.infer<typeof CreateConnectionSchema>
export type UpdateConnectionInput = z.infer<typeof UpdateConnectionSchema>
export type ListConnectionsQuery = z.infer<typeof ListConnectionsQuerySchema>

// PBX Connection response type (never includes password_encrypted)
export interface ConnectionResponse {
  id: string
  tenant_id: string
  name: string
  connection_type: string
  host: string
  port: number
  username: string
  verify_ssl: boolean | null
  webhook_secret: string
  status: string
  last_connected_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
  metadata: Record<string, unknown> | null
  // password_encrypted is NEVER included
}
