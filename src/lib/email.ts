import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set')
}

if (!process.env.RESEND_FROM_EMAIL) {
  throw new Error('RESEND_FROM_EMAIL environment variable is not set')
}

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL

/**
 * Send a weekly report email to a user
 */
export async function sendWeeklyReport({
  to,
  tenantName,
  reportData,
  unsubscribeToken,
}: {
  to: string
  tenantName: string
  reportData: {
    callsProcessed: number
    sentimentBreakdown: {
      positive: number
      neutral: number
      negative: number
    }
    topKeywords: Array<{ keyword: string; count: number }>
    dateRange: { start: string; end: string }
  }
  unsubscribeToken: string
}) {
  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/email/unsubscribe?token=${unsubscribeToken}`

  const html = generateWeeklyReportHTML({
    tenantName,
    reportData,
    unsubscribeUrl,
  })

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${tenantName} - Weekly Call Analytics Report`,
    html,
  })

  return result
}

/**
 * Generate HTML for weekly report email
 */
function generateWeeklyReportHTML({
  tenantName,
  reportData,
  unsubscribeUrl,
}: {
  tenantName: string
  reportData: {
    callsProcessed: number
    sentimentBreakdown: {
      positive: number
      neutral: number
      negative: number
    }
    topKeywords: Array<{ keyword: string; count: number }>
    dateRange: { start: string; end: string }
  }
  unsubscribeUrl: string
}) {
  const { callsProcessed, sentimentBreakdown, topKeywords, dateRange } = reportData

  const totalSentiment = sentimentBreakdown.positive + sentimentBreakdown.neutral + sentimentBreakdown.negative
  const positivePercent = totalSentiment > 0 ? Math.round((sentimentBreakdown.positive / totalSentiment) * 100) : 0
  const neutralPercent = totalSentiment > 0 ? Math.round((sentimentBreakdown.neutral / totalSentiment) * 100) : 0
  const negativePercent = totalSentiment > 0 ? Math.round((sentimentBreakdown.negative / totalSentiment) * 100) : 0

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Call Analytics Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0F1117; color: #F5F5F7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F1117;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1A1D27; border-radius: 8px; border: 1px solid #2E3142;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #2E3142;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #FF7F50;">AudiaPro</h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #9CA3AF;">Weekly Call Analytics Report</p>
            </td>
          </tr>

          <!-- Tenant Name & Date Range -->
          <tr>
            <td style="padding: 24px 32px;">
              <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #F5F5F7;">${tenantName}</h2>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #9CA3AF;">${dateRange.start} to ${dateRange.end}</p>
            </td>
          </tr>

          <!-- Calls Processed -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="background-color: #0F1117; border-radius: 6px; padding: 20px; border: 1px solid #2E3142;">
                <p style="margin: 0; font-size: 11px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">Calls Processed</p>
                <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: 700; color: #FF7F50;">${callsProcessed}</p>
              </div>
            </td>
          </tr>

          <!-- Sentiment Breakdown -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <h3 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #F5F5F7;">Sentiment Breakdown</h3>

              <!-- Positive -->
              <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-size: 13px; color: #34D399;">Positive</span>
                  <span style="font-size: 13px; color: #F5F5F7; font-weight: 600;">${sentimentBreakdown.positive} (${positivePercent}%)</span>
                </div>
                <div style="background-color: #0F1117; border-radius: 4px; height: 8px; overflow: hidden;">
                  <div style="background-color: #34D399; height: 100%; width: ${positivePercent}%;"></div>
                </div>
              </div>

              <!-- Neutral -->
              <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-size: 13px; color: #60A5FA;">Neutral</span>
                  <span style="font-size: 13px; color: #F5F5F7; font-weight: 600;">${sentimentBreakdown.neutral} (${neutralPercent}%)</span>
                </div>
                <div style="background-color: #0F1117; border-radius: 4px; height: 8px; overflow: hidden;">
                  <div style="background-color: #60A5FA; height: 100%; width: ${neutralPercent}%;"></div>
                </div>
              </div>

              <!-- Negative -->
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-size: 13px; color: #F87171;">Negative</span>
                  <span style="font-size: 13px; color: #F5F5F7; font-weight: 600;">${sentimentBreakdown.negative} (${negativePercent}%)</span>
                </div>
                <div style="background-color: #0F1117; border-radius: 4px; height: 8px; overflow: hidden;">
                  <div style="background-color: #F87171; height: 100%; width: ${negativePercent}%;"></div>
                </div>
              </div>
            </td>
          </tr>

          <!-- Top Keywords -->
          ${
            topKeywords.length > 0
              ? `
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <h3 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #F5F5F7;">Top Action Items</h3>
              ${topKeywords
                .map(
                  (item) => `
              <div style="background-color: #0F1117; border-radius: 6px; padding: 12px 16px; margin-bottom: 8px; border: 1px solid #2E3142; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 13px; color: #F5F5F7;">${item.keyword}</span>
                <span style="font-size: 13px; color: #9CA3AF; font-weight: 600;">${item.count} mentions</span>
              </div>
              `
                )
                .join('')}
            </td>
          </tr>
          `
              : ''
          }

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: block; background-color: #FF7F50; color: #FFFFFF; text-align: center; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">View Full Dashboard</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #2E3142;">
              <p style="margin: 0; font-size: 11px; color: #6B7280; text-align: center;">
                You are receiving this email because you have email notifications enabled for ${tenantName}.
                <br>
                <a href="${unsubscribeUrl}" style="color: #9CA3AF; text-decoration: underline;">Unsubscribe from weekly reports</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
