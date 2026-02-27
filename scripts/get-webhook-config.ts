/**
 * Get webhook configuration details for Acme Corp connection
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const ACME_CONNECTION_ID = 'e2d7e69b-9179-4824-b21c-53249f63fdc2'

async function getWebhookConfig() {
  const { data: connection, error } = await supabase
    .from('pbx_connections')
    .select('id, name, host, port, webhook_secret')
    .eq('id', ACME_CONNECTION_ID)
    .single()

  if (error || !connection) {
    console.error('❌ Error fetching connection:', error)
    return
  }

  console.log('\n🔧 UCM Webhook Configuration for Acme Corp\n')
  console.log('=' .repeat(70))
  console.log('\n📋 Connection Details:')
  console.log(`   Name: ${connection.name}`)
  console.log(`   UCM Host: ${connection.host}`)
  console.log(`   UCM Port: ${connection.port}`)
  console.log('\n🌐 Webhook URL:')
  console.log(`   https://fcubjohwzfhjcwcnwost.supabase.co/api/webhook/grandstream/${connection.id}`)
  console.log('\n🔑 Webhook Secret:')
  console.log(`   ${connection.webhook_secret}`)
  console.log('\n' + '=' .repeat(70))
  console.log('\n📖 Configuration Steps:\n')
  console.log('1. Open browser and navigate to:')
  console.log(`   https://${connection.host}:${connection.port}`)
  console.log('\n2. Log in with your UCM admin credentials')
  console.log('\n3. Navigate to: Call Features → CDR')
  console.log('   (Or: PBX → Call Features → CDR)')
  console.log('\n4. Enable "CDR HTTP Push"')
  console.log('\n5. Configure the following settings:')
  console.log('   - HTTP URL: https://fcubjohwzfhjcwcnwost.supabase.co/api/webhook/grandstream/' + connection.id)
  console.log('   - HTTP Method: POST')
  console.log('   - Authentication Type: Custom Header')
  console.log('   - Header Name: x-webhook-secret')
  console.log(`   - Header Value: ${connection.webhook_secret}`)
  console.log('\n6. Save the configuration')
  console.log('\n7. Make a test call to extension 1000')
  console.log('\n8. Check /admin/calls to see if the call appears\n')
  console.log('=' .repeat(70))
  console.log('\n💡 Troubleshooting:')
  console.log('   - If webhook fails, check UCM logs: Maintenance → Logs → HTTP Push')
  console.log('   - Verify UCM can reach the internet (firewall/NAT)')
  console.log('   - Test webhook endpoint with curl or Postman')
  console.log('\n')
}

getWebhookConfig()
