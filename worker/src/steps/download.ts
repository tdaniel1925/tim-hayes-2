/**
 * Recording Download Step
 * Handles downloading call recordings from Grandstream UCM
 * with retry logic and session management
 */

import https from 'https'

export interface DownloadConfig {
  host: string
  port: number
  username: string
  password: string
  recordingFilename: string
  verifySsl?: boolean
  protocol?: 'http' | 'https' // Allow HTTP for testing, default HTTPS
}

export interface DownloadResult {
  buffer: Buffer
  sizeBytes: number
  attempts: number
}

interface SessionInfo {
  cookie: string
  agent: https.Agent
}

/**
 * Download a recording from Grandstream UCM with retry logic
 * - Retries on 404 (recording not ready) with exponential backoff: 5s, 10s, 20s
 * - Re-authenticates on 401 (session timeout)
 * - Handles self-signed SSL certificates
 */
export async function downloadRecording(config: DownloadConfig): Promise<DownloadResult> {
  const maxRetries = 3
  const backoffDelays = [5000, 10000, 20000] // 5s, 10s, 20s
  let attempts = 0
  let session: SessionInfo | null = null

  // Create HTTPS agent for self-signed certs
  const agent = new https.Agent({
    rejectUnauthorized: config.verifySsl ?? false,
  })

  while (attempts < maxRetries) {
    attempts++

    try {
      // Authenticate if we don't have a session yet
      if (!session) {
        session = await authenticate(config, agent)
      }

      // Attempt to download the recording
      const buffer = await downloadWithSession(config, session)

      return {
        buffer,
        sizeBytes: buffer.length,
        attempts,
      }
    } catch (error) {
      if (error instanceof DownloadError) {
        // Handle 404 - recording not ready yet
        if (error.statusCode === 404) {
          if (attempts < maxRetries) {
            const delay = backoffDelays[attempts - 1]
            console.log(
              `   Recording not ready (404), retrying in ${delay / 1000}s (attempt ${attempts}/${maxRetries})`
            )
            await sleep(delay)
            continue // Retry with same session
          } else {
            throw new Error(
              `Recording not ready after ${maxRetries} attempts. It may be processed later.`
            )
          }
        }

        // Handle 401 - session expired, re-authenticate
        if (error.statusCode === 401) {
          console.log(`   Session expired (401), re-authenticating...`)
          session = null // Clear session to force re-auth
          if (attempts < maxRetries) {
            continue // Retry with new session
          } else {
            throw new Error(`Authentication failed after ${maxRetries} attempts`)
          }
        }

        // Other HTTP errors - don't retry
        throw new Error(`Download failed: HTTP ${error.statusCode} - ${error.message}`)
      }

      // Network or other errors
      if (attempts < maxRetries) {
        const delay = backoffDelays[attempts - 1]
        console.log(
          `   Download error: ${error instanceof Error ? error.message : String(error)}, retrying in ${delay / 1000}s...`
        )
        await sleep(delay)
        continue
      }

      throw error
    }
  }

  throw new Error(`Download failed after ${maxRetries} attempts`)
}

/**
 * Authenticate with Grandstream UCM and return session cookie
 */
async function authenticate(config: DownloadConfig, agent: https.Agent): Promise<SessionInfo> {
  const protocol = config.protocol || 'https'
  const loginUrl = `${protocol}://${config.host}:${config.port}/cgi-bin/api.cgi`
  const loginPayload = JSON.stringify({
    action: 'login',
    username: config.username,
    password: config.password,
    secure: 1,
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginPayload).toString(),
      },
      body: loginPayload,
      signal: controller.signal,
      // @ts-expect-error - Node.js fetch supports agent
      agent,
    })

    if (!response.ok) {
      throw new DownloadError(
        response.status,
        `Authentication failed: HTTP ${response.status}`
      )
    }

    // Extract session cookie
    const setCookie = response.headers.get('set-cookie')
    if (!setCookie) {
      throw new Error('No session cookie received from UCM')
    }

    const sessionCookie = setCookie.split(';')[0]

    return {
      cookie: sessionCookie,
      agent,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Download recording using an authenticated session
 */
async function downloadWithSession(
  config: DownloadConfig,
  session: SessionInfo
): Promise<Buffer> {
  const protocol = config.protocol || 'https'
  const downloadUrl = `${protocol}://${config.host}:${config.port}/cgi-bin/api.cgi?action=getRecording&recordingFile=${encodeURIComponent(config.recordingFilename)}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout for download

  try {
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        Cookie: session.cookie,
      },
      signal: controller.signal,
      // @ts-expect-error - Node.js fetch supports agent
      agent: session.agent,
    })

    if (!response.ok) {
      throw new DownloadError(response.status, `HTTP ${response.status}`)
    }

    // Convert response to buffer
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Custom error class for download-specific errors
 */
class DownloadError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'DownloadError'
  }
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
