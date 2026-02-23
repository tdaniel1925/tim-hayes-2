import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateWeeklyReportData, getTenantReportRecipients, generateUnsubscribeToken } from '@/lib/reports'
import { sendWeeklyReport } from '@/lib/email'
import { createError } from '@/lib/errors'

/**
 * POST /api/admin/reports/weekly/send
 * Trigger weekly report emails for all tenants or a specific tenant
 *
 * Body (optional):
 * {
 *   "tenant_id": "uuid" // If provided, only send report for this tenant
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Only super admins can trigger reports manually
    await verifyAuth(['super_admin'])

    const supabase = createAdminClient()
    const body = await request.json().catch(() => ({}))
    const targetTenantId = body.tenant_id

    // Get tenants to process
    let tenantsQuery = supabase
      .from('tenants')
      .select('id, name, status')
      .eq('status', 'active')

    if (targetTenantId) {
      tenantsQuery = tenantsQuery.eq('id', targetTenantId)
    }

    const { data: tenants, error: tenantsError } = await tenantsQuery

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError)
      createError('VALIDATION_ERROR', 'Failed to fetch tenants')
    }

    if (!tenants || tenants.length === 0) {
      return NextResponse.json(
        {
          message: 'No active tenants found',
          emailsSent: 0,
          tenants: [],
        },
        { status: 200 }
      )
    }

    const results = []
    let totalEmailsSent = 0

    // Process each tenant
    for (const tenant of tenants) {
      try {
        // Generate report data
        const reportData = await generateWeeklyReportData(tenant.id)

        // Skip if no calls processed
        if (reportData.callsProcessed === 0) {
          results.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            status: 'skipped',
            reason: 'No calls processed in the last 7 days',
            emailsSent: 0,
          })
          continue
        }

        // Get recipients
        const recipients = await getTenantReportRecipients(tenant.id)

        if (recipients.length === 0) {
          results.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            status: 'skipped',
            reason: 'No active recipients with email notifications enabled',
            emailsSent: 0,
          })
          continue
        }

        // Send emails to all recipients
        let emailsSentForTenant = 0
        const errors = []

        for (const recipient of recipients) {
          try {
            const unsubscribeToken = generateUnsubscribeToken(recipient.id)

            await sendWeeklyReport({
              to: recipient.email,
              tenantName: tenant.name,
              reportData,
              unsubscribeToken,
            })

            emailsSentForTenant++
          } catch (emailError) {
            console.error(`Error sending email to ${recipient.email}:`, emailError)
            errors.push({
              email: recipient.email,
              error: emailError instanceof Error ? emailError.message : 'Unknown error',
            })
          }
        }

        totalEmailsSent += emailsSentForTenant

        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          status: emailsSentForTenant > 0 ? 'success' : 'failed',
          emailsSent: emailsSentForTenant,
          recipientsCount: recipients.length,
          errors: errors.length > 0 ? errors : undefined,
        })
      } catch (error) {
        console.error(`Error processing tenant ${tenant.id}:`, error)
        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          emailsSent: 0,
        })
      }
    }

    return NextResponse.json({
      message: `Weekly reports processed for ${tenants.length} tenant(s)`,
      emailsSent: totalEmailsSent,
      tenants: results,
    })
  } catch (error) {
    console.error('Error sending weekly reports:', error)

    if (error instanceof Error && 'statusCode' in error && 'code' in error) {
      const err = error as unknown as { statusCode: number; code: string; message: string }
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to send weekly reports' },
      { status: 500 }
    )
  }
}
