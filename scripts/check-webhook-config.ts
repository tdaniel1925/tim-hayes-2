/**
 * Check webhook configuration for Acme Corp connection
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const ACME_CONNECTION_ID = 'e2d7e69b-9179-4824-b21c-53249f63fdc2'

async function checkWebhookConfig() {
  console.log('\n🔍 Checking webhook configuration for Acme Corp...\n')

  // Get connection details
  const { data: connection, error: connError } = await supabase
    .from('pbx_connections')
    .select(`
      *,
      tenants(name, slug)
    `)
    .eq('id', ACME_CONNECTION_ID)
    .single()

  if (connError || !connection) {
    console.error('❌ Error fetching connection:', connError)
    return
  }

  const tenant = connection.tenants as any

  console.log(`📋 Connection Details:`)
  console.log(`   Tenant: ${tenant?.name || 'Unknown'}`)
  console.log(`   Name: ${connection.name}`)
  console.log(`   Status: ${connection.status}`)
  console.log(`   Host: ${connection.host}`)
  console.log(`   Port: ${connection.port}`)
  console.log(`   Webhook Secret: ${connection.webhook_secret ? '✅ Set' : '❌ Not set'}`)
  console.log(`   Created: ${new Date(connection.created_at).toLocaleString()}`)
  console.log(`   Last Sync: ${connection.last_sync ? new Date(connection.last_sync).toLocaleString() : 'Never'}`)

  // Check if webhook URL is accessible
  const webhookUrl = `${supabaseUrl.replace(/https?:\/\//, 'https://')}/api/webhook/grandstream/${ACME_CONNECTION_ID}`
  console.log(`\n🌐 Expected Webhook URL:`)
  console.log(`   ${webhookUrl}`)

  // Check recent webhook calls (if any logs exist)
  console.log(`\n📊 Checking for recent CDR records...`)

  const { data: recentCdrs, error: cdrError } = await supabase
    .from('cdr_records')
    .select('id, start_time, src, dst, disposition, created_at')
    .eq('pbx_connection_id', ACME_CONNECTION_ID)
    .order('created_at', { ascending: false })
    .limit(10)

  if (cdrError) {
    console.error('❌ Error fetching CDRs:', cdrError)
    return
  }

  if (!recentCdrs || recentCdrs.length === 0) {
    console.log('   ⚠️  No CDR records found from webhook calls')
    console.log('   💡 This suggests the webhook is not being called by the UCM')
  } else {
    console.log(`   ✅ Found ${recentCdrs.length} CDR records:`)
    for (const cdr of recentCdrs) {
      console.log(`   - ${new Date(cdr.created_at).toLocaleString()}: ${cdr.src} → ${cdr.dst} (${cdr.disposition})`)
    }
  }

  // Analysis
  console.log(`\n🔍 Analysis:`)
  console.log(`   1. The 30 orphaned recordings (Feb 4-9) suggest:`)
  console.log(`      - Recordings were saved to storage manually or via another process`)
  console.log(`      - The webhook was NOT called by the UCM for these calls`)
  console.log(`      - OR the webhook was called but failed to create CDR records`)
  console.log(`\n   2. To fix this, you need to:`)
  console.log(`      a. Log into the UCM web interface`)
  console.log(`      b. Navigate to Call Features → Call Recording`)
  console.log(`      c. Configure CDR webhook to: ${webhookUrl}`)
  console.log(`      d. Set webhook authentication with the secret from this connection`)
  console.log(`      e. Test with a new call to verify webhook is working`)
  console.log(`\n   3. The import script has now created CDR records for the 30 orphaned recordings`)
  console.log(`      - They will appear in the Calls page`)
  console.log(`      - The worker will process them for transcription and AI analysis`)
}

checkWebhookConfig()
