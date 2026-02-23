import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Admin client with service role key - bypasses RLS
// Use ONLY for:
// - Worker operations (job processing, file uploads)
// - Webhook handlers
// - System operations that need to access all tenant data
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    }
  )
}
