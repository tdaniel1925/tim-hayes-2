import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase/admin'
import { encrypt } from '../src/lib/encryption'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

async function seedTestData() {
  console.log('='.repeat(60))
  console.log('AudiaPro - Seed Test Data')
  console.log('='.repeat(60))
  console.log()

  try {
    const supabase = createAdminClient()

    // 1. Create test tenant "Acme Corp"
    console.log('Checking for existing tenant "Acme Corp"...')
    let { data: tenant } = await supabase
      .from('tenants')
      .select()
      .eq('slug', 'acme-corp')
      .single()

    if (tenant) {
      console.log(`⚠️  Tenant "Acme Corp" already exists (${tenant.id})`)
      console.log('   Deleting existing tenant and recreating...')

      // Delete the existing tenant (CASCADE will delete related records)
      await supabase.from('tenants').delete().eq('id', tenant.id)
      console.log('   ✅ Existing tenant deleted')
    }

    console.log('Creating tenant "Acme Corp"...')
    const { data: newTenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Acme Corp',
        slug: 'acme-corp',
        status: 'active',
        billing_plan: 'professional',
        billing_email: 'billing@acmecorp.com',
        recording_retention_days: 90,
      })
      .select()
      .single()

    if (tenantError) {
      console.error('❌ Error creating tenant:', tenantError.message)
      return
    }

    tenant = newTenant
    console.log(`✅ Tenant created: ${tenant.id}`)
    console.log()

    // 2. Create client admin user for Acme Corp
    console.log('Checking for existing client admin user...')

    // Check if user exists in auth
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers()
    const existingAuthUser = existingAuthUsers?.users?.find((u) => u.email === 'admin@acmecorp.com')

    if (existingAuthUser) {
      console.log('   ⚠️  User admin@acmecorp.com already exists in auth')
      console.log('   Deleting existing user...')
      await supabase.auth.admin.deleteUser(existingAuthUser.id)
      console.log('   ✅ Existing user deleted')
    }

    console.log('Creating client admin user...')
    const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
      email: 'admin@acmecorp.com',
      password: 'acme123',
      email_confirm: true,
    })

    if (adminAuthError) {
      console.error('❌ Error creating admin auth:', adminAuthError.message)
      return
    }

    const { error: adminUserError } = await supabase.from('users').insert({
      id: adminAuth.user.id,
      email: 'admin@acmecorp.com',
      role: 'tenant_admin',
      full_name: 'John Smith',
      is_active: true,
      tenant_id: tenant.id,
    })

    if (adminUserError) {
      console.error('❌ Error creating admin user:', adminUserError.message)
      return
    }

    console.log('✅ Client admin created: admin@acmecorp.com / acme123')
    console.log()

    // 3. Create mock PBX connection
    console.log('Creating PBX connection...')

    // Generate a random webhook secret (32-byte hex)
    const webhookSecret = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')

    const { data: pbxConnection, error: pbxError } = await supabase
      .from('pbx_connections')
      .insert({
        tenant_id: tenant.id,
        name: 'Acme Corp Main PBX',
        connection_type: 'grandstream',
        host: 'pbx.acmecorp.local',
        port: 8089,
        username: 'api_user',
        password_encrypted: encrypt('demo_password'),
        webhook_secret: webhookSecret,
        status: 'active',
        verify_ssl: false,
        last_connected_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (pbxError) {
      console.error('❌ Error creating PBX connection:', pbxError.message)
      return
    }

    console.log(`✅ PBX connection created: ${pbxConnection.id}`)
    console.log()

    // 4. Create 5 sample CDR records with analysis data
    console.log('Creating 5 sample CDR records...')

    const now = new Date()
    const sampleCalls = [
      {
        caller: '+1-555-0101',
        callee: '+1-555-0202',
        duration: 245,
        sentiment: 'positive',
        keywords: ['product inquiry', 'pricing', 'satisfied'],
        summary: 'Customer inquired about pricing for enterprise plan. Positive interaction, customer seemed satisfied with the information provided.',
      },
      {
        caller: '+1-555-0303',
        callee: '+1-555-0404',
        duration: 180,
        sentiment: 'neutral',
        keywords: ['support', 'technical issue', 'resolved'],
        summary: 'Technical support call regarding login issues. Issue was resolved during the call.',
      },
      {
        caller: '+1-555-0505',
        callee: '+1-555-0606',
        duration: 420,
        sentiment: 'negative',
        keywords: ['complaint', 'billing issue', 'escalation'],
        summary: 'Customer complained about unexpected charges on their bill. Call was escalated to billing department for resolution.',
      },
      {
        caller: '+1-555-0707',
        callee: '+1-555-0808',
        duration: 95,
        sentiment: 'positive',
        keywords: ['new customer', 'onboarding', 'excited'],
        summary: 'New customer onboarding call. Customer was enthusiastic and ready to get started with the platform.',
      },
      {
        caller: '+1-555-0909',
        callee: '+1-555-1010',
        duration: 310,
        sentiment: 'neutral',
        keywords: ['feature request', 'feedback', 'discussion'],
        summary: 'Existing customer provided feedback on current features and suggested improvements for the mobile app.',
      },
    ]

    for (let i = 0; i < sampleCalls.length; i++) {
      const call = sampleCalls[i]
      const callTime = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000) // 1, 2, 3, 4, 5 days ago

      // Create CDR record
      const { data: cdr, error: cdrError} = await supabase
        .from('cdr_records')
        .insert({
          tenant_id: tenant.id,
          pbx_connection_id: pbxConnection.id,
          uniqueid: `ACME-CALL-${String(i + 1).padStart(5, '0')}`,
          linkedid: `ACME-CALL-${String(i + 1).padStart(5, '0')}`,
          callid: `${String(i + 1).padStart(5, '0')}`,
          src: call.caller,
          dst: call.callee,
          call_direction: 'inbound',
          start_time: callTime.toISOString(),
          answer_time: callTime.toISOString(),
          end_time: new Date(callTime.getTime() + call.duration * 1000).toISOString(),
          duration_seconds: call.duration,
          billsec_seconds: call.duration,
          disposition: 'ANSWERED',
          recording_filename: `call-${i + 1}.wav`,
          recording_storage_path: `call-recordings/acme-corp/call-${i + 1}.wav`,
          recording_size_bytes: 1024 * 500, // 500 KB
        })
        .select()
        .single()

      if (cdrError) {
        console.error(`❌ Error creating CDR ${i + 1}:`, cdrError.message)
        continue
      }

      // Create call analysis
      const { error: analysisError } = await supabase.from('call_analyses').insert({
        tenant_id: tenant.id,
        cdr_record_id: cdr.id,
        summary: call.summary,
        sentiment_overall: call.sentiment,
        sentiment_score: call.sentiment === 'positive' ? 0.8 : call.sentiment === 'negative' ? -0.6 : 0.2,
        keywords: call.keywords,
      })

      if (analysisError) {
        console.error(`❌ Error creating analysis ${i + 1}:`, analysisError.message)
        continue
      }

      console.log(`  ✅ Call ${i + 1}: ${call.caller} → ${call.callee} (${call.duration}s, ${call.sentiment})`)
    }

    console.log()
    console.log('='.repeat(60))
    console.log('✅ Test data seeded successfully!')
    console.log('='.repeat(60))
    console.log()
    console.log('Test credentials:')
    console.log('  Tenant: Acme Corp')
    console.log('  Email: admin@acmecorp.com')
    console.log('  Password: acme123')
    console.log('  CDR Records: 5 sample calls with analysis')
    console.log()
    console.log('Login at: http://localhost:3000/login')
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

seedTestData()
