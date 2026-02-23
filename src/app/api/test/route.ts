import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Query to count all tables in public schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    if (tablesError) {
      // Fallback: try counting from each table individually
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
          tenants: tenantsCount,
          users: usersCount,
          pbx_connections: connectionsCount,
          cdr_records: cdrCount,
          call_analyses: analysesCount,
          job_queue: jobsCount,
        },
      })
    }

    return NextResponse.json({
      connected: true,
      tables: tables?.length || 0,
      tableNames: tables?.map((t: any) => t.table_name).sort() || [],
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
