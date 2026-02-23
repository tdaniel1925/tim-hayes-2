import { createAdminClient } from './supabase/admin'
import crypto from 'crypto'

/**
 * Generate weekly report data for a tenant
 */
export async function generateWeeklyReportData(tenantId: string) {
  const supabase = createAdminClient()

  // Calculate date range (last 7 days)
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 7)

  // Format dates for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const dateRange = {
    start: formatDate(startDate),
    end: formatDate(endDate),
  }

  // Get calls processed in the last 7 days
  const { data: calls, error: callsError } = await supabase
    .from('cdr_records')
    .select('id, start_time')
    .eq('tenant_id', tenantId)
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())

  if (callsError) {
    console.error('Error fetching calls:', callsError)
    throw new Error('Failed to fetch calls data')
  }

  const callsProcessed = calls?.length || 0

  // Get sentiment breakdown for these calls
  const { data: analyses, error: analysesError } = await supabase
    .from('call_analyses')
    .select('sentiment_overall, keywords')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  if (analysesError) {
    console.error('Error fetching analyses:', analysesError)
    throw new Error('Failed to fetch analyses data')
  }

  // Count sentiment breakdown
  const sentimentBreakdown = {
    positive: 0,
    neutral: 0,
    negative: 0,
  }

  const keywordCounts = new Map<string, number>()

  analyses?.forEach((analysis) => {
    // Count sentiment
    if (analysis.sentiment_overall === 'positive') {
      sentimentBreakdown.positive++
    } else if (analysis.sentiment_overall === 'neutral') {
      sentimentBreakdown.neutral++
    } else if (analysis.sentiment_overall === 'negative') {
      sentimentBreakdown.negative++
    }

    // Count keywords
    if (analysis.keywords && Array.isArray(analysis.keywords)) {
      analysis.keywords.forEach((keyword) => {
        if (typeof keyword === 'string') {
          const normalizedKeyword = keyword.toLowerCase().trim()
          if (normalizedKeyword) {
            keywordCounts.set(normalizedKeyword, (keywordCounts.get(normalizedKeyword) || 0) + 1)
          }
        }
      })
    }
  })

  // Get top 5 keywords
  const topKeywords = Array.from(keywordCounts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    callsProcessed,
    sentimentBreakdown,
    topKeywords,
    dateRange,
  }
}

/**
 * Get all users for a tenant who should receive weekly reports
 */
export async function getTenantReportRecipients(tenantId: string) {
  const supabase = createAdminClient()

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .eq('email_notifications_enabled', true)
    .in('role', ['tenant_admin', 'manager']) // Only send to admins and managers, not viewers

  if (error) {
    console.error('Error fetching report recipients:', error)
    throw new Error('Failed to fetch report recipients')
  }

  return users || []
}

/**
 * Generate an unsubscribe token for a user
 * Format: base64(userId:timestamp:signature)
 */
export function generateUnsubscribeToken(userId: string): string {
  const timestamp = Date.now()
  const secret = process.env.ENCRYPTION_KEY || 'default-secret'
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${userId}:${timestamp}`)
    .digest('hex')

  const token = Buffer.from(`${userId}:${timestamp}:${signature}`).toString('base64url')
  return token
}

/**
 * Verify and decode an unsubscribe token
 */
export function verifyUnsubscribeToken(token: string): { userId: string; timestamp: number } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const [userId, timestampStr, signature] = decoded.split(':')

    if (!userId || !timestampStr || !signature) {
      return null
    }

    const timestamp = parseInt(timestampStr, 10)
    if (isNaN(timestamp)) {
      return null
    }

    // Verify signature
    const secret = process.env.ENCRYPTION_KEY || 'default-secret'
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${userId}:${timestamp}`)
      .digest('hex')

    if (signature !== expectedSignature) {
      return null
    }

    // Token is valid for 30 days
    const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days in ms
    if (Date.now() - timestamp > maxAge) {
      return null
    }

    return { userId, timestamp }
  } catch (error) {
    console.error('Error verifying unsubscribe token:', error)
    return null
  }
}
