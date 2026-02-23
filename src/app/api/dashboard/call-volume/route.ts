import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth, getCurrentTenantId } from '@/lib/auth'
import { createError, VALIDATION_ERRORS } from '@/lib/errors'

// GET /api/dashboard/call-volume - Get call volume for last 30 days
export async function GET() {
  try {
    // Verify authentication and get tenant ID
    await verifyAuth(['client_admin', 'manager', 'viewer', 'super_admin'])
    const tenantId = await getCurrentTenantId()

    const supabase = await createClient()

    // Calculate date range (last 30 days)
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Fetch all calls from last 30 days
    const { data: calls, error } = await supabase
      .from('cdr_records')
      .select('start_time')
      .eq('tenant_id', tenantId)
      .gte('start_time', thirtyDaysAgo.toISOString())
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching call volume:', error)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to fetch call volume')
    }

    // Group calls by date
    const volumeByDate: { [key: string]: number } = {}

    // Initialize all 30 days with 0
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      volumeByDate[dateStr] = 0
    }

    // Count calls per day
    if (calls) {
      calls.forEach((call) => {
        if (call.start_time) {
          const dateStr = call.start_time.split('T')[0]
          if (dateStr in volumeByDate) {
            volumeByDate[dateStr]++
          }
        }
      })
    }

    // Convert to array format for charts
    const volumeData = Object.entries(volumeByDate).map(([date, count]) => ({
      date,
      count,
    }))

    return NextResponse.json({ data: volumeData })
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

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
