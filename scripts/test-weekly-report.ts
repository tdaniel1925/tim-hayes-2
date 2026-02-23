import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase/admin'
import { generateWeeklyReportData, getTenantReportRecipients, generateUnsubscribeToken } from '../src/lib/reports'
import { sendWeeklyReport } from '../src/lib/email'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

async function testWeeklyReport() {
  console.log('='.repeat(60))
  console.log('AudiaPro - Test Weekly Email Report')
  console.log('='.repeat(60))
  console.log()

  try {
    const supabase = createAdminClient()

    // Get all active tenants
    console.log('Step 1: Fetching active tenants...')
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, status')
      .eq('status', 'active')

    if (tenantsError) {
      console.error('❌ Error fetching tenants:', tenantsError.message)
      return
    }

    if (!tenants || tenants.length === 0) {
      console.log('⚠️  No active tenants found')
      return
    }

    console.log(`✅ Found ${tenants.length} active tenant(s)`)
    console.log()

    const results = []
    let totalEmailsSent = 0

    // Process each tenant
    for (const tenant of tenants) {
      console.log(`Processing: ${tenant.name} (${tenant.id})`)
      console.log('-'.repeat(60))

      try {
        // Generate report data
        console.log('  - Generating report data...')
        const reportData = await generateWeeklyReportData(tenant.id)

        console.log(`    Calls processed: ${reportData.callsProcessed}`)
        console.log(`    Sentiment: Positive=${reportData.sentimentBreakdown.positive}, Neutral=${reportData.sentimentBreakdown.neutral}, Negative=${reportData.sentimentBreakdown.negative}`)
        console.log(`    Top keywords: ${reportData.topKeywords.length}`)

        // Skip if no calls processed
        if (reportData.callsProcessed === 0) {
          console.log('  ⚠️  Skipped: No calls processed in the last 7 days')
          results.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            status: 'skipped',
            reason: 'No calls processed',
          })
          console.log()
          continue
        }

        // Get recipients
        console.log('  - Finding email recipients...')
        const recipients = await getTenantReportRecipients(tenant.id)

        console.log(`    Found ${recipients.length} recipient(s)`)

        if (recipients.length === 0) {
          console.log('  ⚠️  Skipped: No active recipients with email notifications enabled')
          results.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            status: 'skipped',
            reason: 'No recipients',
          })
          console.log()
          continue
        }

        // Send emails to all recipients
        console.log('  - Sending emails...')
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

            console.log(`    ✅ Sent to: ${recipient.email}`)
            emailsSentForTenant++
          } catch (emailError) {
            console.error(`    ❌ Failed to send to ${recipient.email}:`, emailError)
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

        console.log(`  ✅ Sent ${emailsSentForTenant} / ${recipients.length} emails`)
      } catch (error) {
        console.error(`  ❌ Error processing tenant:`, error)
        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      console.log()
    }

    // Summary
    console.log('='.repeat(60))
    console.log('Summary')
    console.log('='.repeat(60))
    console.log(`Total emails sent: ${totalEmailsSent}`)
    console.log(`Tenants processed: ${tenants.length}`)
    console.log()

    results.forEach((result) => {
      console.log(`- ${result.tenantName}: ${result.status}`)
      if (result.status === 'success') {
        console.log(`  Emails: ${result.emailsSent} / ${result.recipientsCount}`)
      } else if (result.status === 'skipped') {
        console.log(`  Reason: ${result.reason}`)
      } else if (result.status === 'failed') {
        console.log(`  Error: ${result.error}`)
      }
    })

    console.log()
    console.log('='.repeat(60))
    console.log('Check your email inbox for the weekly report!')
    console.log('='.repeat(60))
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

testWeeklyReport().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
