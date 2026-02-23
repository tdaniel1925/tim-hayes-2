import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth, getCurrentTenantId } from '@/lib/auth'
import { createError, VALIDATION_ERRORS } from '@/lib/errors'

// GET /api/dashboard/stats - Get dashboard statistics for current tenant
export async function GET() {
  try {
    // Verify authentication and get tenant ID
    await verifyAuth(['tenant_admin', 'manager', 'viewer', 'super_admin'])
    const tenantId = await getCurrentTenantId()

    const supabase = await createClient()

    // Calculate date ranges
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get calls today
    const { count: callsToday, error: todayError } = await supabase
      .from('cdr_records')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('start_time', todayStart.toISOString())

    if (todayError) {
      console.error('Error fetching calls today:', todayError)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to fetch stats')
    }

    // Get calls this month
    const { count: callsThisMonth, error: monthError } = await supabase
      .from('cdr_records')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('start_time', monthStart.toISOString())

    if (monthError) {
      console.error('Error fetching calls this month:', monthError)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to fetch stats')
    }

    // Get average duration (only for answered calls with duration > 0)
    const { data: durationData, error: durationError } = await supabase
      .from('cdr_records')
      .select('duration_seconds')
      .eq('tenant_id', tenantId)
      .eq('disposition', 'ANSWERED')
      .gt('duration_seconds', 0)

    if (durationError) {
      console.error('Error fetching duration data:', durationError)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to fetch stats')
    }

    const avgDuration =
      durationData && durationData.length > 0
        ? Math.round(
            durationData.reduce((sum, record) => sum + (record.duration_seconds || 0), 0) /
              durationData.length
          )
        : 0

    // Get sentiment breakdown from call_analyses
    const { data: sentimentData, error: sentimentError } = await supabase
      .from('call_analyses')
      .select('sentiment_overall')
      .eq('tenant_id', tenantId)

    if (sentimentError) {
      console.error('Error fetching sentiment data:', sentimentError)
      createError(VALIDATION_ERRORS.INVALID_INPUT, 'Failed to fetch stats')
    }

    // Count sentiments
    const sentimentBreakdown = {
      positive: 0,
      negative: 0,
      neutral: 0,
      mixed: 0,
    }

    if (sentimentData) {
      sentimentData.forEach((analysis) => {
        const sentiment = analysis.sentiment_overall
        if (sentiment && sentiment in sentimentBreakdown) {
          sentimentBreakdown[sentiment as keyof typeof sentimentBreakdown]++
        }
      })
    }

    return NextResponse.json({
      callsToday: callsToday || 0,
      callsThisMonth: callsThisMonth || 0,
      avgDuration,
      sentimentBreakdown,
    })
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
