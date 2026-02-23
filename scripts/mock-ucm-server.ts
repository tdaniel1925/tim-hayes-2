/**
 * Mock Grandstream UCM Server for Local Development
 * Simulates UCM API endpoints for testing without real hardware
 */

import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const PORT = 8089
const USERNAME = 'admin'
const PASSWORD = 'admin123'

// Store active sessions (in-memory for mock)
const sessions = new Map<string, { username: string; created: number }>()

function generateSessionId(): string {
  return `mock-session-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

const server = createServer(async (req, res) => {
  // Enable CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  console.log(`[Mock UCM] ${req.method} ${req.url}`)

  // Parse URL
  const url = new URL(req.url!, `http://localhost:${PORT}`)
  const action = url.searchParams.get('action')

  // Handle POST requests (login, etc.)
  if (req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        const data = JSON.parse(body)

        // Handle login
        if (data.action === 'login') {
          if (data.username === USERNAME && data.password === PASSWORD) {
            const sessionId = generateSessionId()
            sessions.set(sessionId, {
              username: data.username,
              created: Date.now(),
            })

            console.log(`[Mock UCM] Login successful for ${data.username}`)
            console.log(`[Mock UCM] Session ID: ${sessionId}`)

            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Set-Cookie': `session=${sessionId}; Path=/; HttpOnly`,
            })
            res.end(
              JSON.stringify({
                response: 'success',
                message: 'Login successful',
              })
            )
          } else {
            console.log(`[Mock UCM] Login failed: invalid credentials`)
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(
              JSON.stringify({
                response: 'error',
                message: 'Invalid username or password',
              })
            )
          }
          return
        }

        // Unknown POST action
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            response: 'error',
            message: 'Unknown action',
          })
        )
      } catch (error) {
        console.error('[Mock UCM] Error parsing request:', error)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            response: 'error',
            message: 'Invalid JSON',
          })
        )
      }
    })
    return
  }

  // Handle GET requests (authenticated endpoints)
  if (req.method === 'GET') {
    // Check session
    const cookie = req.headers.cookie
    const sessionMatch = cookie?.match(/session=([^;]+)/)
    const sessionId = sessionMatch?.[1]

    if (!sessionId || !sessions.has(sessionId)) {
      console.log(`[Mock UCM] Unauthorized: no valid session`)
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          response: 'error',
          message: 'Unauthorized',
        })
      )
      return
    }

    // Verify session is not expired (15 min timeout)
    const session = sessions.get(sessionId)!
    if (Date.now() - session.created > 15 * 60 * 1000) {
      sessions.delete(sessionId)
      console.log(`[Mock UCM] Session expired`)
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          response: 'error',
          message: 'Session expired',
        })
      )
      return
    }

    // Handle listPbx (connection test)
    if (action === 'listPbx') {
      console.log(`[Mock UCM] listPbx request - returning mock PBX data`)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          response: 'success',
          pbx_list: [
            {
              name: 'Mock UCM 6308',
              version: '1.0.25.20',
              extensions: 100,
              trunks: 5,
            },
          ],
        })
      )
      return
    }

    // Handle getRecording
    if (action === 'getRecording') {
      const recordingFile = url.searchParams.get('recordingFile')
      console.log(`[Mock UCM] getRecording request: ${recordingFile}`)

      // Try to serve sample recording if it exists
      const samplePath = join(__dirname, '../fixtures/sample-recording.wav')

      if (existsSync(samplePath)) {
        console.log(`[Mock UCM] Serving sample recording from fixtures`)
        const audioData = readFileSync(samplePath)
        res.writeHead(200, {
          'Content-Type': 'audio/wav',
          'Content-Length': audioData.length,
        })
        res.end(audioData)
      } else {
        // Generate a minimal WAV file (silence)
        console.log(`[Mock UCM] Generating minimal WAV file (no sample found)`)
        const minimalWav = generateMinimalWav(5) // 5 seconds of silence
        res.writeHead(200, {
          'Content-Type': 'audio/wav',
          'Content-Length': minimalWav.length,
        })
        res.end(minimalWav)
      }
      return
    }

    // Unknown GET action
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        response: 'error',
        message: `Unknown action: ${action}`,
      })
    )
    return
  }

  // Method not allowed
  res.writeHead(405, { 'Content-Type': 'application/json' })
  res.end(
    JSON.stringify({
      response: 'error',
      message: 'Method not allowed',
    })
  )
})

/**
 * Generate a minimal WAV file with silence
 * Useful when no sample recording is available
 */
function generateMinimalWav(durationSeconds: number): Buffer {
  const sampleRate = 8000 // 8kHz (telephone quality)
  const numChannels = 1 // Mono
  const bitsPerSample = 16
  const numSamples = sampleRate * durationSeconds

  const dataSize = numSamples * numChannels * (bitsPerSample / 8)
  const fileSize = 44 + dataSize

  const buffer = Buffer.alloc(fileSize)

  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(fileSize - 8, 4)
  buffer.write('WAVE', 8)

  // fmt chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // fmt chunk size
  buffer.writeUInt16LE(1, 20) // audio format (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28) // byte rate
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32) // block align
  buffer.writeUInt16LE(bitsPerSample, 34)

  // data chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  // Fill with silence (zeros) - already done by Buffer.alloc

  return buffer
}

// Cleanup old sessions every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.created > 15 * 60 * 1000) {
      sessions.delete(sessionId)
      console.log(`[Mock UCM] Cleaned up expired session ${sessionId}`)
    }
  }
}, 5 * 60 * 1000)

server.listen(PORT, () => {
  console.log('🎭 Mock Grandstream UCM Server')
  console.log('=' .repeat(50))
  console.log(`📡 Listening on: http://localhost:${PORT}`)
  console.log(`   Also available as: https://localhost:${PORT} (with SSL warnings)`)
  console.log(`\n🔐 Test Credentials:`)
  console.log(`   Username: ${USERNAME}`)
  console.log(`   Password: ${PASSWORD}`)
  console.log(`\n🔧 Supported Endpoints:`)
  console.log(`   POST /cgi-bin/api.cgi (action=login)`)
  console.log(`   GET  /cgi-bin/api.cgi?action=listPbx`)
  console.log(`   GET  /cgi-bin/api.cgi?action=getRecording&recordingFile=...`)
  console.log(`\n💡 Usage:`)
  console.log(`   1. Keep this server running`)
  console.log(`   2. Create a PBX connection pointing to localhost:${PORT}`)
  console.log(`   3. Test the connection via API`)
  console.log(`   4. Use in worker development`)
  console.log(`\n⚠️  Note: This is a MOCK server for development only!`)
  console.log('=' .repeat(50))
})
