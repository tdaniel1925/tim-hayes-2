/**
 * Check for existing PBX connections in the database
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkConnections() {
  console.log('\n🔍 Checking for existing PBX connections...\n')

  const { data: connections, error } = await supabase
    .from('pbx_connections')
    .select('id, name, tenant_id, host, port, username, created_at, last_connected_at, last_error')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('❌ Error querying connections:', error)
    return
  }

  if (!connections || connections.length === 0) {
    console.log('📭 No PBX connections found in database')
    console.log('\nℹ️  This explains the confusion:')
    console.log('   - The CODE has UCM integration logic (src/lib/integrations/grandstream.ts)')
    console.log('   - But no actual UCM connections have been CREATED yet')
    console.log('   - You need to create a connection via the UI at /admin/connections')
    return
  }

  console.log(`✅ Found ${connections.length} connection(s):\n`)

  for (const conn of connections) {
    console.log(`┌─ Connection: ${conn.name}`)
    console.log(`│  ID: ${conn.id}`)
    console.log(`│  Host: ${conn.host}:${conn.port}`)
    console.log(`│  Username: ${conn.username}`)
    console.log(`│  Created: ${new Date(conn.created_at).toLocaleString()}`)
    console.log(`│  Last Connected: ${conn.last_connected_at ? new Date(conn.last_connected_at).toLocaleString() : 'Never'}`)
    console.log(`│  Last Error: ${conn.last_error || 'None'}`)
    console.log('└─\n')
  }

  console.log('\nℹ️  Connections exist in database. Credentials are encrypted in the database.')
}

checkConnections()
