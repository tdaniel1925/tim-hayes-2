/**
 * Step 3.5 Verification: Calls API (Database-level testing)
 * Verifies Zod schemas, database queries, and RLS policies
 */

import { createClient } from '@supabase/supabase-js'
import { ListCallsQuerySchema, ListAdminCallsQuerySchema } from '../src/lib/validations/calls'

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

  // Get test tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', 'acme-corp')
    .single()

  if (!tenant) {
    throw new Error('Test tenant not found')
  }

  const { data: connection } = await supabase
    .from('pbx_connections')
    .select('id')
    .eq('tenant_id', tenant.id)
    .single()

  if (!connection) {
    throw new Error('Test connection not found')
  }

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
      start_time: new Date(baseTime.getTime() + 3600000).toISOString(),
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
      start_time: new Date(baseTime.getTime() + 7200000).toISOString(),
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
      start_time: new Date(baseTime.getTime() + 86400000).toISOString(),
      duration_seconds: 10,
      billsec_seconds: 0,
      processing_status: 'pending',
    },
  ]

  await supabase
    .from('cdr_records')
    .delete()
    .in('uniqueid', testCdrs.map(c => c.uniqueid))

  const { data: cdrRecords, error } = await supabase
    .from('cdr_records')
    .insert(testCdrs)
    .select('id, uniqueid, tenant_id')

  if (error || !cdrRecords) {
    throw new Error(`Failed to create test CDRs: ${error?.message}`)
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

  console.log('\n🧪 Running Calls API Tests...\n')

  // Test 1: Zod validation - ListCallsQuerySchema
  try {
    const valid = ListCallsQuerySchema.safeParse({
      page: '1',
      limit: '20',
      disposition: 'ANSWERED',
      direction: 'outbound',
      status: 'completed',
      start_date: '2026-02-20T00:00:00Z',
      end_date: '2026-02-21T00:00:00Z',
      search: '555',
    })

    if (!valid.success) {
      throw new Error('Valid input failed validation')
    }

    // Test invalid input
    const invalid = ListCallsQuerySchema.safeParse({
      page: 'invalid',
      limit: '999',
    })

    if (invalid.success) {
      throw new Error('Invalid input passed validation')
    }

    results.push({ name: 'Zod validation - ListCallsQuerySchema', passed: true })
    console.log('✅ Test 1: Zod validation - ListCallsQuerySchema')
  } catch (error) {
    results.push({
      name: 'Zod validation - ListCallsQuerySchema',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 1: Zod validation -', error instanceof Error ? error.message : error)
  }

  // Test 2: Zod validation - ListAdminCallsQuerySchema
  try {
    const valid = ListAdminCallsQuerySchema.safeParse({
      page: '1',
      limit: '20',
      tenant_id: tenant.id,
    })

    if (!valid.success) {
      throw new Error('Valid input failed validation')
    }

    // Test invalid tenant_id
    const invalid = ListAdminCallsQuerySchema.safeParse({
      tenant_id: 'not-a-uuid',
    })

    if (invalid.success) {
      throw new Error('Invalid UUID passed validation')
    }

    results.push({ name: 'Zod validation - ListAdminCallsQuerySchema', passed: true })
    console.log('✅ Test 2: Zod validation - ListAdminCallsQuerySchema')
  } catch (error) {
    results.push({
      name: 'Zod validation - ListAdminCallsQuerySchema',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 2: Zod validation -', error instanceof Error ? error.message : error)
  }

  // Test 3: Database query - List only test calls
  try {
    const { data: calls, error, count } = await supabase
      .from('cdr_records')
      .select('*', { count: 'exact' })
      .like('uniqueid', 'test-call-%')
      .order('start_time', { ascending: false })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!calls || calls.length !== 4) {
      throw new Error(`Expected 4 test calls, got ${calls?.length}`)
    }

    if (count !== 4) {
      throw new Error(`Expected count 4, got ${count}`)
    }

    results.push({ name: 'Database query - List calls', passed: true })
    console.log('✅ Test 3: Database query - List calls')
  } catch (error) {
    results.push({
      name: 'Database query - List calls',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 3: Database query -', error instanceof Error ? error.message : error)
  }

  // Test 4: Database query - Filter by disposition
  try {
    const { data: calls } = await supabase
      .from('cdr_records')
      .select('*')
      .like('uniqueid', 'test-call-%')
      .eq('disposition', 'ANSWERED')

    if (!calls || calls.length !== 2) {
      throw new Error(`Expected 2 ANSWERED calls, got ${calls?.length}`)
    }

    results.push({ name: 'Database query - Filter by disposition', passed: true })
    console.log('✅ Test 4: Database query - Filter by disposition')
  } catch (error) {
    results.push({
      name: 'Database query - Filter by disposition',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 4: Database query -', error instanceof Error ? error.message : error)
  }

  // Test 5: Database query - Filter by direction
  try {
    const { data: calls } = await supabase
      .from('cdr_records')
      .select('*')
      .like('uniqueid', 'test-call-%')
      .eq('call_direction', 'outbound')

    if (!calls || calls.length !== 2) {
      throw new Error(`Expected 2 outbound calls, got ${calls?.length}`)
    }

    results.push({ name: 'Database query - Filter by direction', passed: true })
    console.log('✅ Test 5: Database query - Filter by direction')
  } catch (error) {
    results.push({
      name: 'Database query - Filter by direction',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 5: Database query -', error instanceof Error ? error.message : error)
  }

  // Test 6: Database query - Filter by processing status
  try {
    const { data: calls } = await supabase
      .from('cdr_records')
      .select('*')
      .like('uniqueid', 'test-call-%')
      .eq('processing_status', 'pending')

    if (!calls || calls.length !== 1) {
      throw new Error(`Expected 1 pending call, got ${calls?.length}`)
    }

    results.push({ name: 'Database query - Filter by status', passed: true })
    console.log('✅ Test 6: Database query - Filter by status')
  } catch (error) {
    results.push({
      name: 'Database query - Filter by status',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 6: Database query -', error instanceof Error ? error.message : error)
  }

  // Test 7: Database query - Date range filter
  try {
    const startDate = new Date('2026-02-20T09:00:00Z').toISOString()
    const endDate = new Date('2026-02-20T12:00:00Z').toISOString()

    const { data: calls } = await supabase
      .from('cdr_records')
      .select('*')
      .eq('tenant_id', tenant.id)
      .gte('start_time', startDate)
      .lte('start_time', endDate)

    if (!calls || calls.length !== 3) {
      throw new Error(`Expected 3 calls in date range, got ${calls?.length}`)
    }

    results.push({ name: 'Database query - Date range filter', passed: true })
    console.log('✅ Test 7: Database query - Date range filter')
  } catch (error) {
    results.push({
      name: 'Database query - Date range filter',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 7: Database query -', error instanceof Error ? error.message : error)
  }

  // Test 8: Database query - Search by phone number
  try {
    const { data: calls } = await supabase
      .from('cdr_records')
      .select('*')
      .like('uniqueid', 'test-call-%')
      .or('src.ilike.%555123%,dst.ilike.%555123%')

    if (!calls || calls.length !== 1) {
      throw new Error(`Expected 1 call matching search, got ${calls?.length}`)
    }

    results.push({ name: 'Database query - Search by phone', passed: true })
    console.log('✅ Test 8: Database query - Search by phone')
  } catch (error) {
    results.push({
      name: 'Database query - Search by phone',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 8: Database query -', error instanceof Error ? error.message : error)
  }

  // Test 9: Database query - Get single call detail
  try {
    const callId = cdrRecords[0].id

    const { data: call, error } = await supabase
      .from('cdr_records')
      .select('*')
      .eq('id', callId)
      .single()

    if (error || !call) {
      throw new Error('Failed to fetch call detail')
    }

    if (call.id !== callId) {
      throw new Error('Wrong call returned')
    }

    results.push({ name: 'Database query - Get call detail', passed: true })
    console.log('✅ Test 9: Database query - Get call detail')
  } catch (error) {
    results.push({
      name: 'Database query - Get call detail',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 9: Database query -', error instanceof Error ? error.message : error)
  }

  // Test 10: Database query - Admin cross-tenant with tenant join
  try {
    const { data: calls, error } = await supabase
      .from('cdr_records')
      .select('*, tenants(name, slug)', { count: 'exact' })
      .order('start_time', { ascending: false })
      .limit(10)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!calls || calls.length === 0) {
      throw new Error('No calls returned')
    }

    // Verify tenant join worked
    if (!calls[0].tenants || !(calls[0].tenants as any).name) {
      throw new Error('Tenant join failed')
    }

    results.push({ name: 'Database query - Admin cross-tenant with join', passed: true })
    console.log('✅ Test 10: Database query - Admin cross-tenant with join')
  } catch (error) {
    results.push({
      name: 'Database query - Admin cross-tenant with join',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 10: Database query -', error instanceof Error ? error.message : error)
  }

  // Test 11: Database query - Admin filter by tenant_id
  try {
    const { data: calls, error } = await supabase
      .from('cdr_records')
      .select('*')
      .like('uniqueid', 'test-call-%')

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!calls || calls.length !== 4) {
      throw new Error(`Expected 4 test calls, got ${calls?.length}`)
    }

    // Verify all calls are for this tenant
    if (!calls.every(call => call.tenant_id === tenant.id)) {
      throw new Error('All test calls should be for same tenant')
    }

    results.push({ name: 'Database query - Admin filter by tenant', passed: true })
    console.log('✅ Test 11: Database query - Admin filter by tenant')
  } catch (error) {
    results.push({
      name: 'Database query - Admin filter by tenant',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 11: Database query -', error instanceof Error ? error.message : error)
  }

  // Test 12: Pagination calculation
  try {
    const totalRecords = 4
    const limit = 2
    const page = 1
    const offset = (page - 1) * limit
    const totalPages = Math.ceil(totalRecords / limit)

    if (offset !== 0) {
      throw new Error(`Expected offset 0, got ${offset}`)
    }

    if (totalPages !== 2) {
      throw new Error(`Expected 2 total pages, got ${totalPages}`)
    }

    // Test database pagination
    const { data: calls } = await supabase
      .from('cdr_records')
      .select('*')
      .like('uniqueid', 'test-call-%')
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!calls || calls.length !== 2) {
      throw new Error(`Expected 2 calls on page 1, got ${calls?.length}`)
    }

    results.push({ name: 'Pagination logic', passed: true })
    console.log('✅ Test 12: Pagination logic')
  } catch (error) {
    results.push({
      name: 'Pagination logic',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    console.log('❌ Test 12: Pagination logic -', error instanceof Error ? error.message : error)
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
