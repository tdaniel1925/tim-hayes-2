import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/webhook/test-clouducm
 * Temporary test endpoint to see if CloudUCM is sending webhooks
 * NO AUTHENTICATION - for debugging only
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

    // Log everything
    console.log('='.repeat(80))
    console.log('TEST WEBHOOK RECEIVED FROM CLOUDUCM')
    console.log('='.repeat(80))
    console.log('Headers:', JSON.stringify(headers, null, 2))
    console.log('Body:', JSON.stringify(body, null, 2))
    console.log('='.repeat(80))

    return NextResponse.json(
      {
        message: 'Test webhook received successfully',
        timestamp: new Date().toISOString(),
        received: true,
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
