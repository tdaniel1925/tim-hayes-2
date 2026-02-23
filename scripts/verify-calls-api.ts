/**
 * Step 3.5 Verification: Calls API
 * Tests GET /api/dashboard/calls, GET /api/dashboard/calls/[id], GET /api/admin/calls
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

async function setupTestData() {
  console.log('\n🔧 Setting up test data...')

  // Get test tenant and connection
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug')
    .eq('slug', 'acme-corp')
    .single()

  if (!tenant) {
    throw new Error('Test tenant not found. Run seed script first.')
  }

  const { data: connection } = await supabase
    .from('pbx_connections')
    .select('id')
    .eq('tenant_id', tenant.id)
    .single()

  if (!connection) {
    throw new Error('Test connection not found.')
  }

  // Create test CDR records with various filters
  const baseTime = new Date('2026-02-20T10:00:00Z')

  const testCdrs = [
    {
      tenant_id: tenant.id,
      pbx_connection_id: connection.id,
      uniqueid: 'test-call-1',
      src: '1001',
      dst: '2001',
      call_direction: 'internal',
      disposition: 'ANSWERED',
      start_time: baseTime.toISOString(),
      duration_seconds: 120,
      billsec_seconds: 115,
      processing_status: 'completed',
    },
    {
      tenant_id: tenant.id,
      pbx_connection_id: connection.id,
      uniqueid: 'test-call-2',
      src: '1002',
      dst: '5551234567',
      call_direction: 'outbound',
      disposition: 'ANSWERED',
      start_time: new Date(baseTime.getTime() + 3600000).toISOString(), // +1 hour
      duration_seconds: 300,
      billsec_seconds: 295,
      processing_status: 'completed',
    },
    {
      tenant_id: tenant.id,
      pbx_connection_id: connection.id,
      uniqueid: 'test-call-3',
      src: '5559876543',
      dst: '1003',
      call_direction: 'inbound',
      disposition: 'NO ANSWER',
      start_time: new Date(baseTime.getTime() + 7200000).toISOString(), // +2 hours
      duration_seconds: 30,
      billsec_seconds: 0,
      processing_status: 'completed',
    },
    {
      tenant_id: tenant.id,
      pbx_connection_id: connection.id,
      uniqueid: 'test-call-4',
      src: '1004',
      dst: '5551111111',
      call_direction: 'outbound',
      disposition: 'BUSY',
      start_time: new Date(baseTime.getTime() + 86400000).toISOString(), // +1 day
      duration_seconds: 10,
      billsec_seconds: 0,
      processing_status: 'pending',
    },
  ]

  // Delete existing test CDRs
  await supabase
    .from('cdr_records')
    .delete()
    .in('uniqueid', testCdrs.map(c => c.uniqueid))

  // Insert test CDRs
  const { data: cdrRecords, error: cdrError } = await supabase
    .from('cdr_records')
    .insert(testCdrs)
    .select('id, uniqueid, tenant_id')

  if (cdrError || !cdrRecords) {
    throw new Error(`Failed to create test CDRs: ${cdrError?.message}`)
  }

  console.log(`✅ Created ${cdrRecords.length} test CDR records`)

  return { tenant, cdrRecords }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...')

  await supabase
    .from('cdr_records')
    .delete()
    .like('uniqueid', 'test-call-%')

  console.log('✅ Cleanup complete')
}

async function runTests() {
  let testData: Awaited<ReturnType<typeof setupTestData>>

  try {
    testData = await setupTestData()
  } catch (error) {
    console.error('❌ Test data setup failed:', error)
    process.exit(1)
  }

  const { tenant, cdrRecords } = testData

  // Sign in as tenant admin
  const { data: tenantAuth, error: tenantSignInError } = await supabase.auth.signInWithPassword({
    email: 'admin@acmecorp.com',
    password: 'acme123',
  })

  if (tenantSignInError || !tenantAuth?.session) {
    console.error('❌ Failed to sign in as tenant admin:', tenantSignInError?.message)
    await cleanupTestData()
    process.exit(1)
  }

  const tenantAccessToken = tenantAuth.session.access_token

  // Sign in as super admin (need a new client)
  const supabaseForSuperAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  const { data: superAdminAuth, error: superAdminSignInError } = await supabaseForSuperAdmin.auth.signInWithPassword({
    email: 'admin@audiapro.com',
    password: 'admin123',
  })

  if (superAdminSignInError || !superAdminAuth?.session) {
    console.error('❌ Failed to sign in as super admin:', superAdminSignInError?.message)
    await cleanupTestData()
    process.exit(1)
  }

  const superAdminAccessToken = superAdminAuth.session.access_token

  console.log('\n🧪 Running Calls API Tests...\n')

  // Test 1: GET /api/dashboard/calls - Basic list
  try {
    const response = await fetch('http://localhost:3001/api/dashboard/calls', {
      headers: {
        'Authorization': `Bearer ${tenantAccessToken}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`)
    }

    if (!Array.isArray(data.data)) {
      throw new Error('Response data is not an array')
    }

    if (data.data.length !== 4) {
      throw new Error(`Expected 4 calls, got ${data.data.length}`)
    }

    if (!data.pagination || data.pagination.total !== 4) {
      throw new Error('Pagination info missing or incorrect')
    }

    results.push({ name: 'GET /api/dashboard/calls - Basic list', passed: true })
    console.log('✅ Test 1: Basic list')
  } catch (error) {
    results.push({
      name: 'GET /api/dashboard/calls - Basic list',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 1: Basic list -', error instanceof Error ? error.message : error)
  }

  // Test 2: GET /api/dashboard/calls - Filter by disposition
  try {
    const response = await fetch(
      'http://localhost:3001/api/dashboard/calls?disposition=ANSWERED',
      {
        headers: {
          'Authorization': `Bearer ${tenantAccessToken}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`)
    }

    if (data.data.length !== 2) {
      throw new Error(`Expected 2 ANSWERED calls, got ${data.data.length}`)
    }

    results.push({ name: 'GET /api/dashboard/calls - Filter by disposition', passed: true })
    console.log('✅ Test 2: Filter by disposition')
  } catch (error) {
    results.push({
      name: 'GET /api/dashboard/calls - Filter by disposition',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 2: Filter by disposition -', error instanceof Error ? error.message : error)
  }

  // Test 3: GET /api/dashboard/calls - Filter by direction
  try {
    const response = await fetch(
      'http://localhost:3001/api/dashboard/calls?direction=outbound',
      {
        headers: {
          'Authorization': `Bearer ${tenantAccessToken}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`)
    }

    if (data.data.length !== 2) {
      throw new Error(`Expected 2 outbound calls, got ${data.data.length}`)
    }

    results.push({ name: 'GET /api/dashboard/calls - Filter by direction', passed: true })
    console.log('✅ Test 3: Filter by direction')
  } catch (error) {
    results.push({
      name: 'GET /api/dashboard/calls - Filter by direction',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 3: Filter by direction -', error instanceof Error ? error.message : error)
  }

  // Test 4: GET /api/dashboard/calls - Filter by status
  try {
    const response = await fetch(
      'http://localhost:3001/api/dashboard/calls?status=pending',
      {
        headers: {
          'Authorization': `Bearer ${tenantAccessToken}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`)
    }

    if (data.data.length !== 1) {
      throw new Error(`Expected 1 pending call, got ${data.data.length}`)
    }

    results.push({ name: 'GET /api/dashboard/calls - Filter by status', passed: true })
    console.log('✅ Test 4: Filter by status')
  } catch (error) {
    results.push({
      name: 'GET /api/dashboard/calls - Filter by status',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 4: Filter by status -', error instanceof Error ? error.message : error)
  }

  // Test 5: GET /api/dashboard/calls - Date range filter
  try {
    const startDate = new Date('2026-02-20T09:00:00Z').toISOString()
    const endDate = new Date('2026-02-20T12:00:00Z').toISOString()

    const response = await fetch(
      `http://localhost:3001/api/dashboard/calls?start_date=${startDate}&end_date=${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${tenantAccessToken}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`)
    }

    if (data.data.length !== 3) {
      throw new Error(`Expected 3 calls in date range, got ${data.data.length}`)
    }

    results.push({ name: 'GET /api/dashboard/calls - Date range filter', passed: true })
    console.log('✅ Test 5: Date range filter')
  } catch (error) {
    results.push({
      name: 'GET /api/dashboard/calls - Date range filter',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 5: Date range filter -', error instanceof Error ? error.message : error)
  }

  // Test 6: GET /api/dashboard/calls - Search by phone number
  try {
    const response = await fetch(
      'http://localhost:3001/api/dashboard/calls?search=555123',
      {
        headers: {
          'Authorization': `Bearer ${tenantAccessToken}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`)
    }

    if (data.data.length !== 1) {
      throw new Error(`Expected 1 call matching search, got ${data.data.length}`)
    }

    if (!data.data[0].dst.includes('555123')) {
      throw new Error('Search result does not match query')
    }

    results.push({ name: 'GET /api/dashboard/calls - Search by phone', passed: true })
    console.log('✅ Test 6: Search by phone')
  } catch (error) {
    results.push({
      name: 'GET /api/dashboard/calls - Search by phone',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 6: Search by phone -', error instanceof Error ? error.message : error)
  }

  // Test 7: GET /api/dashboard/calls - Pagination
  try {
    const response = await fetch(
      'http://localhost:3001/api/dashboard/calls?page=1&limit=2',
      {
        headers: {
          'Authorization': `Bearer ${tenantAccessToken}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`)
    }

    if (data.data.length !== 2) {
      throw new Error(`Expected 2 calls on page 1, got ${data.data.length}`)
    }

    if (data.pagination.totalPages !== 2) {
      throw new Error(`Expected 2 total pages, got ${data.pagination.totalPages}`)
    }

    results.push({ name: 'GET /api/dashboard/calls - Pagination', passed: true })
    console.log('✅ Test 7: Pagination')
  } catch (error) {
    results.push({
      name: 'GET /api/dashboard/calls - Pagination',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 7: Pagination -', error instanceof Error ? error.message : error)
  }

  // Test 8: GET /api/dashboard/calls/[id] - Call detail
  try {
    const callId = cdrRecords[0].id

    const response = await fetch(
      `http://localhost:3001/api/dashboard/calls/${callId}`,
      {
        headers: {
          'Authorization': `Bearer ${tenantAccessToken}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`)
    }

    if (!data.call || data.call.id !== callId) {
      throw new Error('Call data missing or incorrect')
    }

    if (!data.signedUrls || typeof data.signedUrls !== 'object') {
      throw new Error('Signed URLs missing')
    }

    results.push({ name: 'GET /api/dashboard/calls/[id] - Call detail', passed: true })
    console.log('✅ Test 8: Call detail')
  } catch (error) {
    results.push({
      name: 'GET /api/dashboard/calls/[id] - Call detail',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 8: Call detail -', error instanceof Error ? error.message : error)
  }

  // Test 9: GET /api/dashboard/calls/[id] - Tenant isolation
  try {
    const callId = cdrRecords[0].id

    // Try to access as super admin (different tenant context)
    const response = await fetch(
      `http://localhost:3001/api/dashboard/calls/${callId}`,
      {
        headers: {
          'Authorization': `Bearer ${superAdminAccessToken}`,
        },
      }
    )

    const data = await response.json()

    // Super admin should be able to access any tenant's calls
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`)
    }

    if (!data.call || data.call.id !== callId) {
      throw new Error('Super admin should access call')
    }

    results.push({ name: 'GET /api/dashboard/calls/[id] - Super admin access', passed: true })
    console.log('✅ Test 9: Super admin access')
  } catch (error) {
    results.push({
      name: 'GET /api/dashboard/calls/[id] - Super admin access',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 9: Super admin access -', error instanceof Error ? error.message : error)
  }

  // Test 10: GET /api/admin/calls - Cross-tenant list (super admin only)
  try {
    const response = await fetch(
      'http://localhost:3001/api/admin/calls',
      {
        headers: {
          'Authorization': `Bearer ${superAdminAccessToken}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`)
    }

    if (!Array.isArray(data.data)) {
      throw new Error('Response data is not an array')
    }

    // Should see all calls across all tenants
    if (data.data.length < 4) {
      throw new Error(`Expected at least 4 calls, got ${data.data.length}`)
    }

    // Check that tenant info is included
    if (!data.data[0].tenants || !data.data[0].tenants.name) {
      throw new Error('Tenant info not joined')
    }

    results.push({ name: 'GET /api/admin/calls - Cross-tenant list', passed: true })
    console.log('✅ Test 10: Cross-tenant list')
  } catch (error) {
    results.push({
      name: 'GET /api/admin/calls - Cross-tenant list',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 10: Cross-tenant list -', error instanceof Error ? error.message : error)
  }

  // Test 11: GET /api/admin/calls - Filter by tenant
  try {
    const response = await fetch(
      `http://localhost:3001/api/admin/calls?tenant_id=${tenant.id}`,
      {
        headers: {
          'Authorization': `Bearer ${superAdminAccessToken}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`)
    }

    if (data.data.length !== 4) {
      throw new Error(`Expected 4 calls for tenant, got ${data.data.length}`)
    }

    // All calls should be for this tenant
    if (!data.data.every((call: any) => call.tenant_id === tenant.id)) {
      throw new Error('Filter by tenant_id not working')
    }

    results.push({ name: 'GET /api/admin/calls - Filter by tenant', passed: true })
    console.log('✅ Test 11: Filter by tenant')
  } catch (error) {
    results.push({
      name: 'GET /api/admin/calls - Filter by tenant',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 11: Filter by tenant -', error instanceof Error ? error.message : error)
  }

  // Test 12: GET /api/admin/calls - Tenant admin cannot access
  try {
    const response = await fetch(
      'http://localhost:3001/api/admin/calls',
      {
        headers: {
          'Authorization': `Bearer ${tenantAccessToken}`,
        },
      }
    )

    const data = await response.json()

    // Should fail with 403
    if (response.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${response.status}`)
    }

    results.push({ name: 'GET /api/admin/calls - Tenant admin denied', passed: true })
    console.log('✅ Test 12: Tenant admin denied')
  } catch (error) {
    results.push({
      name: 'GET /api/admin/calls - Tenant admin denied',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 12: Tenant admin denied -', error instanceof Error ? error.message : error)
  }

  await cleanupTestData()

  // Print summary
  console.log('\n' + '='.repeat(50))
  console.log('TEST SUMMARY')
  console.log('='.repeat(50))

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  console.log(`\n✅ Passed: ${passed}/${results.length}`)
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}/${results.length}\n`)
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  ❌ ${r.name}`)
        console.log(`     Error: ${r.error}`)
      })
  }

  console.log('\n' + '='.repeat(50))

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch(error => {
  console.error('\n💥 Test runner failed:', error)
  process.exit(1)
})
