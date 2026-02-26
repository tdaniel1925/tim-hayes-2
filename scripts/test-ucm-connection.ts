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
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: loginPayload,
      // @ts-ignore
      agent,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    console.log(`\n📡 Response Status: ${response.status} ${response.statusText}`)

    const responseText = await response.text()
    console.log(`📄 Response Body: ${responseText.substring(0, 200)}...`)

    if (!response.ok) {
      console.log('\n❌ Connection FAILED')
      console.log(`Error: HTTP ${response.status} - ${response.statusText}`)
      return
    }

    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      console.log(`🍪 Session Cookie: ${setCookie.split(';')[0]}`)
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
