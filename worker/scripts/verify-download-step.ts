/**
 * Verification script for Step 4.2: Recording Download
 * Tests download with mock server scenarios:
 * 1. Successful download returns Buffer
 * 2. Retries on 404 up to 3 times
 * 3. Re-authenticates on 401
 */

import { downloadRecording } from '../src/steps/download'
import http from 'http'

// =============================================================================
// Mock Grandstream UCM Server
// =============================================================================

interface MockConfig {
  simulateNotReady?: number // Number of 404s before success
  simulateSessionExpire?: boolean // Return 401 on first download attempt
}

function createMockServer(mockConfig: MockConfig = {}) {
  let attemptCount = 0
  let sessionValid = true

  const server = http.createServer((req, res) => {
    const url = new URL(req.url!, `http://${req.headers.host}`)

    // Login endpoint
    if (url.pathname === '/cgi-bin/api.cgi' && req.method === 'POST') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', () => {
        const data = JSON.parse(body)
        if (data.action === 'login' && data.username === 'admin' && data.password === 'test') {
          res.setHeader('Set-Cookie', 'session=mock-session-123; Path=/')
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ response: 'success' }))
          sessionValid = true
        } else {
          res.writeHead(401)
          res.end(JSON.stringify({ response: 'error', message: 'Invalid credentials' }))
        }
      })
      return
    }

    // Download endpoint
    if (url.pathname === '/cgi-bin/api.cgi' && url.searchParams.get('action') === 'getRecording') {
      attemptCount++

      // Simulate session expiration (401)
      if (mockConfig.simulateSessionExpire && attemptCount === 1 && sessionValid) {
        sessionValid = false
        res.writeHead(401)
        res.end(JSON.stringify({ response: 'error', message: 'Session expired' }))
        return
      }

      // Simulate recording not ready (404)
      if (mockConfig.simulateNotReady && attemptCount <= mockConfig.simulateNotReady) {
        res.writeHead(404)
        res.end(JSON.stringify({ response: 'error', message: 'Recording not found' }))
        return
      }

      // Success - return mock audio data
      const mockAudioData = Buffer.from('RIFF....WAV mock audio data')
      res.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Content-Length': mockAudioData.length.toString(),
      })
      res.end(mockAudioData)
      return
    }

    // Unknown endpoint
    res.writeHead(404)
    res.end('Not found')
  })

  return { server, getAttemptCount: () => attemptCount }
}

// =============================================================================
// Test Cases
// =============================================================================

async function runTests() {
  console.log('='.repeat(60))
  console.log('Step 4.2 Verification: Recording Download')
  console.log('='.repeat(60))
  console.log()

  let passed = 0
  let failed = 0

  // Test 1: Successful download returns Buffer
  console.log('Test 1: Successful download returns Buffer')
  {
    const { server, getAttemptCount } = createMockServer()
    await new Promise<void>((resolve) => server.listen(8089, () => resolve()))
    await new Promise((resolve) => setTimeout(resolve, 100)) // Small delay to ensure server is ready

    try {
      const result = await downloadRecording({
        host: 'localhost',
        port: 8089,
        username: 'admin',
        password: 'test',
        recordingFilename: 'test.wav',
        verifySsl: false,
        protocol: 'http',
      })

      if (Buffer.isBuffer(result.buffer)) {
        console.log('   ✅ Returns Buffer')
      } else {
        console.log('   ❌ Did not return Buffer')
        failed++
      }

      if (result.sizeBytes === result.buffer.length) {
        console.log(`   ✅ Size matches (${result.sizeBytes} bytes)`)
      } else {
        console.log('   ❌ Size mismatch')
        failed++
      }

      if (result.attempts === 1) {
        console.log('   ✅ Succeeded on first attempt')
        passed++
      } else {
        console.log(`   ❌ Expected 1 attempt, got ${result.attempts}`)
        failed++
      }

      server.close()
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
      failed++
      server.close()
    }
  }

  console.log()

  // Test 2: Retries on 404 up to 3 times
  console.log('Test 2: Retries on 404 (recording not ready)')
  {
    const { server, getAttemptCount } = createMockServer({ simulateNotReady: 2 })
    await new Promise<void>((resolve) => server.listen(8089, () => resolve()))
    await new Promise((resolve) => setTimeout(resolve, 100)) // Small delay to ensure server is ready

    try {
      console.log('   Simulating 2x 404 responses before success...')
      const result = await downloadRecording({
        host: 'localhost',
        port: 8089,
        username: 'admin',
        password: 'test',
        recordingFilename: 'test.wav',
        verifySsl: false,
        protocol: 'http',
      })

      if (result.attempts === 3) {
        console.log('   ✅ Succeeded after 3 attempts (2 retries)')
        passed++
      } else {
        console.log(`   ❌ Expected 3 attempts, got ${result.attempts}`)
        failed++
      }

      if (Buffer.isBuffer(result.buffer) && result.buffer.length > 0) {
        console.log('   ✅ Still returns valid Buffer after retries')
      } else {
        console.log('   ❌ Invalid Buffer after retries')
        failed++
      }

      server.close()
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
      failed++
      server.close()
    }
  }

  console.log()

  // Test 3: Re-authenticates on 401
  console.log('Test 3: Re-authenticates on 401 (session expired)')
  {
    const { server } = createMockServer({ simulateSessionExpire: true })
    await new Promise<void>((resolve) => server.listen(8089, () => resolve()))
    await new Promise((resolve) => setTimeout(resolve, 100)) // Small delay to ensure server is ready

    try {
      console.log('   Simulating session expiration on first download...')
      const result = await downloadRecording({
        host: 'localhost',
        port: 8089,
        username: 'admin',
        password: 'test',
        recordingFilename: 'test.wav',
        verifySsl: false,
        protocol: 'http',
      })

      if (result.attempts === 2) {
        console.log('   ✅ Re-authenticated and succeeded (2 attempts)')
        passed++
      } else {
        console.log(`   ❌ Expected 2 attempts, got ${result.attempts}`)
        failed++
      }

      if (Buffer.isBuffer(result.buffer) && result.buffer.length > 0) {
        console.log('   ✅ Returns valid Buffer after re-auth')
      } else {
        console.log('   ❌ Invalid Buffer after re-auth')
        failed++
      }

      server.close()
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
      failed++
      server.close()
    }
  }

  console.log()

  // Test 4: Fails after max retries on persistent 404
  console.log('Test 4: Fails after max retries on persistent 404')
  {
    const { server } = createMockServer({ simulateNotReady: 999 })
    await new Promise<void>((resolve) => server.listen(8089, () => resolve()))
    await new Promise((resolve) => setTimeout(resolve, 100)) // Small delay to ensure server is ready

    try {
      console.log('   Simulating persistent 404 (never becomes ready)...')
      await downloadRecording({
        host: 'localhost',
        port: 8089,
        username: 'admin',
        password: 'test',
        recordingFilename: 'test.wav',
        verifySsl: false,
        protocol: 'http',
      })

      console.log('   ❌ Should have thrown error after max retries')
      failed++
      server.close()
    } catch (error) {
      if (error instanceof Error && error.message.includes('not ready after 3 attempts')) {
        console.log('   ✅ Throws error after max retries')
        console.log(`   ✅ Error message: "${error.message}"`)
        passed++
      } else {
        console.log(`   ❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
        failed++
      }
      server.close()
    }
  }

  console.log()
  console.log('='.repeat(60))
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('='.repeat(60))

  if (failed === 0) {
    console.log('✅ All tests passed!')
    process.exit(0)
  } else {
    console.log('❌ Some tests failed')
    process.exit(1)
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
