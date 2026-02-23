import { z } from 'zod'

// Call disposition enum
export const CallDispositionSchema = z.enum([
  'ANSWERED',
  'NO ANSWER',
  'BUSY',
  'FAILED',
  'CONGESTION',
])

// Call direction enum
export const CallDirectionSchema = z.enum(['inbound', 'outbound', 'internal'])

// Processing status enum
export const ProcessingStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
])

// List calls query parameters schema (GET /api/dashboard/calls)
export const ListCallsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),

  // Filters
  disposition: CallDispositionSchema.optional(),
  direction: CallDirectionSchema.optional(),
  status: ProcessingStatusSchema.optional(),

  // Date range
  start_date: z.string().optional(), // ISO date string
  end_date: z.string().optional(), // ISO date string

  // Search
  search: z.string().optional(), // Search by phone number (src or dst)
})

// List admin calls query parameters (GET /api/admin/calls)
export const ListAdminCallsQuerySchema = ListCallsQuerySchema.extend({
  tenant_id: z.string().uuid().optional(), // Filter by tenant
})

// Types inferred from schemas
export type ListCallsQuery = z.infer<typeof ListCallsQuerySchema>
export type ListAdminCallsQuery = z.infer<typeof ListAdminCallsQuerySchema>
