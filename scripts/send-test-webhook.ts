/**
 * Send test webhook to local development server
 * Simulates Grandstream UCM sending a CDR webhook
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/supabase/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

async function main() {
  console.log('📞 Sending Test Webhook to AudiaPro\n')

  // Create service role client
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Get first active PBX connection
  const { data: connection, error: connError } = await supabase
    .from('pbx_connections')
    .select('id, name, webhook_secret, tenant_id')
    .eq('status', 'active')
    .limit(1)
    .single()

  if (connError || !connection) {
    console.error('❌ No active PBX connection found.')
    console.log('\nPlease create a connection first using:')
    console.log('  npx tsx scripts/verify-connection-api.ts')
    process.exit(1)
  }

  console.log(`Using connection: ${connection.name}`)
  console.log(`Connection ID: ${connection.id}`)
  console.log(`Webhook secret: ${connection.webhook_secret.substring(0, 16)}...\n`)

  // Generate unique call ID
  const timestamp = Date.now()
  const callNum = Math.floor(Math.random() * 1000)
  const uniqueid = `${timestamp}.${callNum}`

  // Current time for timestamps
  const now = new Date()
  const callStart = new Date(now.getTime() - 5 * 60 * 1000) // 5 min ago
  const callAnswer = new Date(now.getTime() - 4.5 * 60 * 1000) // 4.5 min ago
  const callEnd = now

  const duration = Math.floor((callEnd.getTime() - callStart.getTime()) / 1000)
  const billsec = Math.floor((callEnd.getTime() - callAnswer.getTime()) / 1000)

  // Sample CDR payload (Grandstream format)
  const payload = {
    event: 'cdr',
    uniqueid: uniqueid,
    linkedid: uniqueid,
    session: `session-${timestamp}`,
    callid: `call-${timestamp}`,

    // Call parties
    src: '1001', // Internal extension
    dst: '18005551234', // External number
    clid: '"John Doe" <1001>',

    // Timing (Grandstream format: YYYY-MM-DD HH:MM:SS)
    start: formatGrandstreamDate(callStart),
    answer: formatGrandstreamDate(callAnswer),
    end: formatGrandstreamDate(callEnd),
    duration: duration.toString(),
    billsec: billsec.toString(),

    // Status
    disposition: 'ANSWERED',
    amaflags: 'DOCUMENTATION',

    // Channel info
    dcontext: 'from-internal',
    channel: 'SIP/1001-00000001',
    dstchannel: 'SIP/trunk-00000002',

    // Recording
    recording_filename: `/var/spool/asterisk/monitor/${formatFileDate(callStart)}/recording-${uniqueid}.wav`,

    // Grandstream-specific
    lastapp: 'Dial',
    lastdata: 'SIP/trunk/18005551234',
    accountcode: '',
    userfield: '',
    did: '',
    outbound_cnum: '1001',
    outbound_cnam: 'John Doe',
    dst_cnam: '',
    peeraccount: 'trunk',
    sequence: '1',
    src_trunk_name: '',
    dst_trunk_name: 'Primary Trunk',
  }

  console.log('📋 Webhook Payload:')
  console.log(`   Uniqueid: ${payload.uniqueid}`)
  console.log(`   From: ${payload.src} (${payload.clid})`)
  console.log(`   To: ${payload.dst}`)
  console.log(`   Duration: ${payload.duration}s (billable: ${payload.billsec}s)`)
  console.log(`   Disposition: ${payload.disposition}`)
  console.log(`   Recording: ${payload.recording_filename}`)
  console.log(`   Direction: Outbound (has dst_trunk_name)\n`)

  // Send webhook
  console.log('🚀 Sending webhook...')
  const webhookUrl = `${API_URL}/api/webhook/grandstream/${connection.id}`

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': connection.webhook_secret,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ Webhook accepted!\n')
      console.log('Response:')
      console.log(`   Status: ${response.status}`)
      console.log(`   Message: ${data.message}`)
      console.log(`   CDR ID: ${data.cdr_id}`)
      console.log(`   Job ID: ${data.job_id || 'None'}`)
      console.log(`   Direction: ${data.call_direction}`)
      console.log(`   Has Recording: ${data.has_recording}`)

      if (data.duplicate) {
        console.log('\n⚠️  Note: This was a duplicate call (already processed)')
      }

      console.log('\n✨ Success! You can now:')
      console.log('   1. Check the CDR record in the database')
      console.log('   2. Check the job queue')
      console.log('   3. View in the dashboard (once UI is built)')
    } else {
      console.error(`❌ Webhook rejected: ${response.status}`)
      console.error('Response:', data)
    }
  } catch (error) {
    console.error('❌ Failed to send webhook:', error)
    console.error('\nMake sure the dev server is running:')
    console.error('  npm run dev')
  }
}

// Helper: Format date for Grandstream (YYYY-MM-DD HH:MM:SS)
function formatGrandstreamDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

// Helper: Format date for file path (YYYY/MM/DD)
function formatFileDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
