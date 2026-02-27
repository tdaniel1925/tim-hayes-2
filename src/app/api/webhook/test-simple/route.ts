import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/webhook/test-simple
 * Ultra-simple test endpoint - no database, no auth
 * Just logs and returns success
 */
export async function POST(request: NextRequest) {
  try {
    // Log all headers
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Get raw body
    const body = await request.json()

    // Log everything to console (visible in Vercel logs)
    const timestamp = new Date().toISOString()
    console.log('='.repeat(80))
    console.log(`WEBHOOK RECEIVED: ${timestamp}`)
    console.log('='.repeat(80))
    console.log('Headers:', JSON.stringify(headers, null, 2))
    console.log('Body:', JSON.stringify(body, null, 2))
    console.log('='.repeat(80))

    return NextResponse.json(
      {
        message: 'Webhook received successfully',
        timestamp,
        received: true,
        hasValidCdrData: !!(body.uniqueid && body.src && body.dst),
        bodyKeys: Object.keys(body),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process test webhook',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
