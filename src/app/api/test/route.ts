import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Count rows in each table to verify connection
    const [
      { count: tenantsCount },
      { count: usersCount },
      { count: connectionsCount },
      { count: cdrCount },
      { count: analysesCount },
      { count: jobsCount },
    ] = await Promise.all([
      supabase.from('tenants').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('pbx_connections').select('*', { count: 'exact', head: true }),
      supabase.from('cdr_records').select('*', { count: 'exact', head: true }),
      supabase.from('call_analyses').select('*', { count: 'exact', head: true }),
      supabase.from('job_queue').select('*', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      connected: true,
      tables: 6,
      counts: {
        tenants: tenantsCount ?? 0,
        users: usersCount ?? 0,
        pbx_connections: connectionsCount ?? 0,
        cdr_records: cdrCount ?? 0,
        call_analyses: analysesCount ?? 0,
        job_queue: jobsCount ?? 0,
      },
    })
  } catch (error) {
    console.error('Database connection test failed:', error)
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
