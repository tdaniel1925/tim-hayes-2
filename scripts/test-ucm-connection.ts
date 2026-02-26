import https from 'https'

interface TestConfig {
  host: string
  port: number
  username: string
  password: string
}

async function testUCMConnection(config: TestConfig) {
  console.log('\n🔍 Testing UCM Connection...')
  console.log(`Host: ${config.host}`)
  console.log(`Port: ${config.port}`)
  console.log(`Username: ${config.username}`)
  console.log(`Password: ${'*'.repeat(config.password.length)}\n`)

  const agent = new https.Agent({
    rejectUnauthorized: false, // Accept self-signed certs
  })

  const loginUrl = `https://${config.host}:${config.port}/cgi-bin/api.cgi`
  const loginPayload = JSON.stringify({
    action: 'login',
    username: config.username,
    password: config.password,
    secure: 1,
  })

  console.log(`🌐 Attempting to connect to: ${loginUrl}`)

  try {
    // Use native https module with custom agent
    const response = await new Promise<{
      statusCode: number
      statusMessage: string
      body: string
      setCookie?: string
    }>((resolve, reject) => {
      const req = https.request(
        loginUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': loginPayload.length,
          },
          agent,
          timeout: 10000,
        },
        (res) => {
          let body = ''
          res.on('data', (chunk) => (body += chunk))
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode!,
              statusMessage: res.statusMessage!,
              body,
              setCookie: res.headers['set-cookie']?.[0],
            })
          })
        }
      )

      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Connection timeout'))
      })

      req.write(loginPayload)
      req.end()
    })

    console.log(`\n📡 Response Status: ${response.statusCode} ${response.statusMessage}`)
    console.log(`📄 Response Body: ${response.body.substring(0, 200)}...`)

    if (response.statusCode !== 200) {
      console.log('\n❌ Connection FAILED')
      console.log(`Error: HTTP ${response.statusCode} - ${response.statusMessage}`)
      return
    }

    if (response.setCookie) {
      console.log(`🍪 Session Cookie: ${response.setCookie.split(';')[0]}`)
      console.log('\n✅ Connection SUCCESSFUL!')
    } else {
      console.log('\n⚠️  Connected but no session cookie received')
    }

  } catch (error: any) {
    console.log('\n❌ Connection FAILED')
    if (error.name === 'AbortError') {
      console.log('Error: Connection timeout (10 seconds)')
      console.log('Possible causes:')
      console.log('  - UCM is offline or unreachable')
      console.log('  - Firewall blocking port')
      console.log('  - Wrong IP address')
    } else if (error.code === 'ECONNREFUSED') {
      console.log('Error: Connection refused')
      console.log('Possible causes:')
      console.log('  - Wrong port number')
      console.log('  - UCM service not running')
      console.log('  - Firewall blocking connection')
    } else if (error.code === 'ENOTFOUND') {
      console.log('Error: Host not found')
      console.log('Possible causes:')
      console.log('  - Wrong IP address or hostname')
      console.log('  - DNS resolution failed')
    } else {
      console.log(`Error: ${error.message}`)
      console.log(`Code: ${error.code || 'N/A'}`)
    }
  }
}

// Get credentials from command line arguments
const args = process.argv.slice(2)

if (args.length < 4) {
  console.log('Usage: npx tsx scripts/test-ucm-connection.ts <host> <port> <username> <password>')
  console.log('Example: npx tsx scripts/test-ucm-connection.ts 192.168.1.100 8089 admin mypassword')
  process.exit(1)
}

const config: TestConfig = {
  host: args[0],
  port: parseInt(args[1]),
  username: args[2],
  password: args[3],
}

testUCMConnection(config)
