/**
 * Grandstream UCM API Integration
 * Handles connection testing, authentication, and recording downloads
 */

import https from 'https'

export interface GrandstreamConnectionConfig {
  host: string
  port: number
  username: string
  password: string
  verifySsl?: boolean
}

export interface GrandstreamTestResult {
  success: boolean
  message: string
  error?: string
  responseTime?: number
}

/**
 * Test connection to Grandstream UCM
 * Attempts to login and retrieve basic system info
 */
export async function testGrandstreamConnection(
  config: GrandstreamConnectionConfig,
  timeoutMs: number = 10000
): Promise<GrandstreamTestResult> {
  const startTime = Date.now()

  try {
    // Create HTTPS agent with SSL verification settings
    const agent = new https.Agent({
      rejectUnauthorized: config.verifySsl ?? false, // Most UCMs use self-signed certs
    })

    // Step 1: Login to get session cookie
    const loginUrl = `https://${config.host}:${config.port}/cgi-bin/api.cgi`
    const loginPayload = JSON.stringify({
      action: 'login',
      username: config.username,
      password: config.password,
      secure: 1,
    })

    const loginResponse = await fetchWithTimeout(
      loginUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(loginPayload).toString(),
        },
        body: loginPayload,
        agent,
      },
      timeoutMs
    )

    if (!loginResponse.ok) {
      const responseTime = Date.now() - startTime
      return {
        success: false,
        message: 'Authentication failed',
        error: `HTTP ${loginResponse.status}: ${loginResponse.statusText}`,
        responseTime,
      }
    }

    // Extract session cookie
    const setCookie = loginResponse.headers.get('set-cookie')
    if (!setCookie) {
      return {
        success: false,
        message: 'No session cookie received',
        error: 'UCM did not return a session cookie',
        responseTime: Date.now() - startTime,
      }
    }

    const sessionCookie = setCookie.split(';')[0]

    // Step 2: Test authenticated request (listPbx)
    const testUrl = `https://${config.host}:${config.port}/cgi-bin/api.cgi?action=listPbx`
    const testResponse = await fetchWithTimeout(
      testUrl,
      {
        method: 'GET',
        headers: {
          Cookie: sessionCookie,
        },
        agent,
      },
      timeoutMs
    )

    if (!testResponse.ok) {
      const responseTime = Date.now() - startTime
      return {
        success: false,
        message: 'Authenticated request failed',
        error: `HTTP ${testResponse.status}: ${testResponse.statusText}`,
        responseTime,
      }
    }

    // Parse response
    const responseData = await testResponse.json()

    // Check for UCM error response
    if (responseData.response === 'error') {
      const responseTime = Date.now() - startTime
      return {
        success: false,
        message: 'UCM returned error',
        error: responseData.message || 'Unknown UCM error',
        responseTime,
      }
    }

    const responseTime = Date.now() - startTime

    return {
      success: true,
      message: 'Connection successful',
      responseTime,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    if (error instanceof Error) {
      // Handle specific error types
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Connection timeout',
          error: `Request timed out after ${timeoutMs}ms`,
          responseTime,
        }
      }

      // Network errors
      if ('code' in error) {
        const code = (error as NodeJS.ErrnoException).code
        const errorMessages: Record<string, string> = {
          ECONNREFUSED: 'Connection refused - UCM may be offline or unreachable',
          EHOSTUNREACH: 'Host unreachable - check network connectivity',
          ETIMEDOUT: 'Connection timed out',
          ENOTFOUND: 'Host not found - check hostname/IP address',
          ECONNRESET: 'Connection reset by UCM',
          CERT_HAS_EXPIRED: 'SSL certificate expired',
          DEPTH_ZERO_SELF_SIGNED_CERT: 'Self-signed certificate (enable verify_ssl: false)',
        }

        return {
          success: false,
          message: 'Network error',
          error: code ? (errorMessages[code] || `${code}: ${error.message}`) : error.message,
          responseTime,
        }
      }

      return {
        success: false,
        message: 'Connection error',
        error: error.message,
        responseTime,
      }
    }

    return {
      success: false,
      message: 'Unknown error',
      error: String(error),
      responseTime,
    }
  }
}

/**
 * Fetch with timeout support
 * Node.js fetch doesn't have built-in timeout, so we implement it
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { agent?: https.Agent },
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Download recording from Grandstream UCM
 * Used by the background worker
 */
export async function downloadRecording(
  config: GrandstreamConnectionConfig,
  recordingFilename: string,
  timeoutMs: number = 30000
): Promise<Buffer> {
  // Create HTTPS agent
  const agent = new https.Agent({
    rejectUnauthorized: config.verifySsl ?? false,
  })

  // Login to get session cookie
  const loginUrl = `https://${config.host}:${config.port}/cgi-bin/api.cgi`
  const loginPayload = JSON.stringify({
    action: 'login',
    username: config.username,
    password: config.password,
    secure: 1,
  })

  const loginResponse = await fetchWithTimeout(
    loginUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginPayload).toString(),
      },
      body: loginPayload,
      agent,
    },
    timeoutMs
  )

  if (!loginResponse.ok) {
    throw new Error(`Login failed: HTTP ${loginResponse.status}`)
  }

  const setCookie = loginResponse.headers.get('set-cookie')
  if (!setCookie) {
    throw new Error('No session cookie received')
  }

  const sessionCookie = setCookie.split(';')[0]

  // Download recording
  const downloadUrl = `https://${config.host}:${config.port}/cgi-bin/api.cgi?action=getRecording&recordingFile=${encodeURIComponent(recordingFilename)}`

  const downloadResponse = await fetchWithTimeout(
    downloadUrl,
    {
      method: 'GET',
      headers: {
        Cookie: sessionCookie,
      },
      agent,
    },
    timeoutMs
  )

  if (!downloadResponse.ok) {
    throw new Error(`Download failed: HTTP ${downloadResponse.status}`)
  }

  // Convert response to buffer
  const arrayBuffer = await downloadResponse.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
