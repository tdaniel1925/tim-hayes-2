import { NextRequest, NextResponse } from 'next/server'
import { verifyUnsubscribeToken } from '@/lib/reports'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/email/unsubscribe?token=xxx
 * Unsubscribe a user from weekly email reports
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return new NextResponse(
        `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invalid Unsubscribe Link - AudiaPro</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0F1117;
      color: #F5F5F7;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      max-width: 500px;
      padding: 40px 24px;
      text-align: center;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #F87171;
      margin-bottom: 16px;
    }
    p {
      font-size: 13px;
      color: #9CA3AF;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    a {
      display: inline-block;
      background-color: #FF7F50;
      color: #FFFFFF;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Invalid Unsubscribe Link</h1>
    <p>The unsubscribe link you clicked is invalid or malformed. Please contact support if you need assistance.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}">Return to AudiaPro</a>
  </div>
</body>
</html>
        `,
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' },
        }
      )
    }

    // Verify the token
    const verified = verifyUnsubscribeToken(token)

    if (!verified) {
      return new NextResponse(
        `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invalid or Expired Link - AudiaPro</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0F1117;
      color: #F5F5F7;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      max-width: 500px;
      padding: 40px 24px;
      text-align: center;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #F87171;
      margin-bottom: 16px;
    }
    p {
      font-size: 13px;
      color: #9CA3AF;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    a {
      display: inline-block;
      background-color: #FF7F50;
      color: #FFFFFF;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Invalid or Expired Link</h1>
    <p>This unsubscribe link has expired or is invalid. Unsubscribe links are valid for 30 days. Please use a more recent email or contact support.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}">Return to AudiaPro</a>
  </div>
</body>
</html>
        `,
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' },
        }
      )
    }

    // Update user's email_notifications_enabled to false
    const supabase = createAdminClient()

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('email, full_name, tenants(name)')
      .eq('id', verified.userId)
      .single()

    if (fetchError || !user) {
      console.error('Error fetching user:', fetchError)
      return new NextResponse(
        `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Not Found - AudiaPro</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0F1117;
      color: #F5F5F7;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      max-width: 500px;
      padding: 40px 24px;
      text-align: center;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #F87171;
      margin-bottom: 16px;
    }
    p {
      font-size: 13px;
      color: #9CA3AF;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    a {
      display: inline-block;
      background-color: #FF7F50;
      color: #FFFFFF;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>User Not Found</h1>
    <p>The user associated with this unsubscribe link could not be found. Please contact support if you need assistance.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}">Return to AudiaPro</a>
  </div>
</body>
</html>
        `,
        {
          status: 404,
          headers: { 'Content-Type': 'text/html' },
        }
      )
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ email_notifications_enabled: false })
      .eq('id', verified.userId)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return new NextResponse(
        `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - AudiaPro</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0F1117;
      color: #F5F5F7;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      max-width: 500px;
      padding: 40px 24px;
      text-align: center;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #F87171;
      margin-bottom: 16px;
    }
    p {
      font-size: 13px;
      color: #9CA3AF;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    a {
      display: inline-block;
      background-color: #FF7F50;
      color: #FFFFFF;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Something Went Wrong</h1>
    <p>We encountered an error while processing your request. Please try again later or contact support.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}">Return to AudiaPro</a>
  </div>
</body>
</html>
        `,
        {
          status: 500,
          headers: { 'Content-Type': 'text/html' },
        }
      )
    }

    // Success response
    return new NextResponse(
      `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed - AudiaPro</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0F1117;
      color: #F5F5F7;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      max-width: 500px;
      padding: 40px 24px;
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      background-color: #34D399;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 32px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #F5F5F7;
      margin-bottom: 16px;
    }
    p {
      font-size: 13px;
      color: #9CA3AF;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .email {
      background-color: #1A1D27;
      border: 1px solid #2E3142;
      border-radius: 6px;
      padding: 12px 16px;
      font-size: 13px;
      color: #F5F5F7;
      margin-bottom: 24px;
    }
    a {
      display: inline-block;
      background-color: #FF7F50;
      color: #FFFFFF;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✓</div>
    <h1>Successfully Unsubscribed</h1>
    <p>You have been unsubscribed from weekly email reports.</p>
    <div class="email">${user.email}</div>
    <p>You can re-enable email notifications at any time from your account settings.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings">Go to Settings</a>
  </div>
</body>
</html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    )
  } catch (error) {
    console.error('Error processing unsubscribe:', error)

    return new NextResponse(
      `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - AudiaPro</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0F1117;
      color: #F5F5F7;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      max-width: 500px;
      padding: 40px 24px;
      text-align: center;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #F87171;
      margin-bottom: 16px;
    }
    p {
      font-size: 13px;
      color: #9CA3AF;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    a {
      display: inline-block;
      background-color: #FF7F50;
      color: #FFFFFF;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Something Went Wrong</h1>
    <p>We encountered an unexpected error while processing your request. Please try again later or contact support.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}">Return to AudiaPro</a>
  </div>
</body>
</html>
      `,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      }
    )
  }
}
