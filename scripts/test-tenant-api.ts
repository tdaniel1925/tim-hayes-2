/**
 * Test script for Tenant CRUD API
 * Tests all endpoints for Step 3.1
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

interface TestResult {
  test: string
  passed: boolean
  error?: string
  response?: unknown
}

const results: TestResult[] = []

function log(test: string, passed: boolean, error?: string, response?: unknown) {
  results.push({ test, passed, error, response })
  const status = passed ? '✅' : '❌'
  console.log(`${status} ${test}`)
  if (error) console.error(`   Error: ${error}`)
  if (response && !passed) console.error('   Response:', JSON.stringify(response, null, 2))
}

async function main() {
  console.log('🧪 Testing Tenant CRUD API\n')

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Login as super admin
  console.log('📝 Logging in as super admin...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@audiapro.com',
    password: 'admin123',
  })

  if (authError || !authData.session) {
    console.error('❌ Failed to login as super admin:', authError)
    process.exit(1)
  }

  const session = authData.session
  console.log('✅ Logged in successfully\n')

  // Test 1: GET /api/tenants (list without auth - should fail)
  console.log('Test 1: GET /api/tenants without auth (should return 401)')
  try {
    const response = await fetch(`${API_URL}/api/tenants`)
    const data = await response.json()

    if (response.status === 401) {
      log('GET /api/tenants without auth returns 401', true)
    } else {
      log('GET /api/tenants without auth returns 401', false, `Expected 401, got ${response.status}`, data)
    }
  } catch (error) {
    log('GET /api/tenants without auth', false, String(error))
  }

  // Test 2: GET /api/tenants (list with auth)
  console.log('\nTest 2: GET /api/tenants with auth (should return list)')
  try {
    const response = await fetch(`${API_URL}/api/tenants`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        Cookie: `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`,
      },
    })
    const data = await response.json()

    if (response.ok && data.data && Array.isArray(data.data)) {
      log('GET /api/tenants returns paginated list', true, undefined, data)
      console.log(`   Found ${data.data.length} tenants`)
    } else {
      log('GET /api/tenants returns paginated list', false, 'Invalid response structure', data)
    }
  } catch (error) {
    log('GET /api/tenants', false, String(error))
  }

  // Test 3: POST /api/tenants (create new tenant)
  console.log('\nTest 3: POST /api/tenants (create new tenant)')
  let newTenantId: string | undefined
  try {
    const newTenant = {
      name: 'Test Tenant API',
      slug: `test-tenant-${Date.now()}`,
      billing_email: 'test@example.com',
      billing_plan: 'starter',
      recording_retention_days: 60,
    }

    const response = await fetch(`${API_URL}/api/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        Cookie: `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`,
      },
      body: JSON.stringify(newTenant),
    })
    const data = await response.json()

    if (response.status === 201 && data.id) {
      newTenantId = data.id
      log('POST /api/tenants creates tenant', true, undefined, data)
      console.log(`   Created tenant ID: ${data.id}`)
    } else {
      log('POST /api/tenants creates tenant', false, 'Failed to create tenant', data)
    }
  } catch (error) {
    log('POST /api/tenants', false, String(error))
  }

  // Test 4: POST /api/tenants with duplicate slug (should fail)
  console.log('\nTest 4: POST /api/tenants with duplicate slug (should return 409)')
  try {
    const duplicateTenant = {
      name: 'Duplicate Test',
      slug: 'acme-corp', // Existing slug from seed data
      billing_email: 'test@example.com',
    }

    const response = await fetch(`${API_URL}/api/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        Cookie: `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`,
      },
      body: JSON.stringify(duplicateTenant),
    })
    const data = await response.json()

    if (response.status === 409) {
      log('POST /api/tenants with duplicate slug returns 409', true)
    } else {
      log('POST /api/tenants with duplicate slug returns 409', false, `Expected 409, got ${response.status}`, data)
    }
  } catch (error) {
    log('POST /api/tenants duplicate', false, String(error))
  }

  // Test 5: GET /api/tenants/[id] (get tenant detail)
  if (newTenantId) {
    console.log('\nTest 5: GET /api/tenants/[id] (get tenant detail)')
    try {
      const response = await fetch(`${API_URL}/api/tenants/${newTenantId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          Cookie: `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`,
        },
      })
      const data = await response.json()

      if (response.ok && data.id === newTenantId) {
        log('GET /api/tenants/[id] returns tenant detail', true, undefined, data)
      } else {
        log('GET /api/tenants/[id] returns tenant detail', false, 'Invalid response', data)
      }
    } catch (error) {
      log('GET /api/tenants/[id]', false, String(error))
    }
  }

  // Test 6: GET /api/tenants/[id] with invalid ID (should return 404)
  console.log('\nTest 6: GET /api/tenants/[id] with invalid ID (should return 404)')
  try {
    const response = await fetch(`${API_URL}/api/tenants/00000000-0000-0000-0000-000000000000`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        Cookie: `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`,
      },
    })
    const data = await response.json()

    if (response.status === 404) {
      log('GET /api/tenants/[id] with invalid ID returns 404', true)
    } else {
      log('GET /api/tenants/[id] with invalid ID returns 404', false, `Expected 404, got ${response.status}`, data)
    }
  } catch (error) {
    log('GET /api/tenants/[id] invalid', false, String(error))
  }

  // Test 7: PATCH /api/tenants/[id] (update tenant)
  if (newTenantId) {
    console.log('\nTest 7: PATCH /api/tenants/[id] (update tenant)')
    try {
      const updates = {
        name: 'Updated Test Tenant',
        billing_plan: 'professional',
        status: 'active',
      }

      const response = await fetch(`${API_URL}/api/tenants/${newTenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          Cookie: `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`,
        },
        body: JSON.stringify(updates),
      })
      const data = await response.json()

      if (response.ok && data.name === 'Updated Test Tenant' && data.billing_plan === 'professional') {
        log('PATCH /api/tenants/[id] updates tenant', true, undefined, data)
      } else {
        log('PATCH /api/tenants/[id] updates tenant', false, 'Update failed or incorrect data', data)
      }
    } catch (error) {
      log('PATCH /api/tenants/[id]', false, String(error))
    }
  }

  // Test 8: GET /api/tenants with pagination
  console.log('\nTest 8: GET /api/tenants with pagination (page=1, limit=2)')
  try {
    const response = await fetch(`${API_URL}/api/tenants?page=1&limit=2`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        Cookie: `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`,
      },
    })
    const data = await response.json()

    if (
      response.ok &&
      data.data &&
      data.pagination &&
      data.pagination.page === 1 &&
      data.pagination.limit === 2
    ) {
      log('GET /api/tenants with pagination works', true, undefined, data.pagination)
      console.log(`   Total: ${data.pagination.total}, Pages: ${data.pagination.totalPages}`)
    } else {
      log('GET /api/tenants with pagination', false, 'Pagination failed', data)
    }
  } catch (error) {
    log('GET /api/tenants pagination', false, String(error))
  }

  // Test 9: GET /api/tenants with status filter
  console.log('\nTest 9: GET /api/tenants with status filter (status=active)')
  try {
    const response = await fetch(`${API_URL}/api/tenants?status=active`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        Cookie: `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`,
      },
    })
    const data = await response.json()

    if (response.ok && data.data) {
      const allActive = data.data.every((t: { status: string }) => t.status === 'active')
      if (allActive) {
        log('GET /api/tenants with status filter works', true)
        console.log(`   Found ${data.data.length} active tenants`)
      } else {
        log('GET /api/tenants with status filter', false, 'Filter returned non-active tenants', data)
      }
    } else {
      log('GET /api/tenants with status filter', false, 'Filter failed', data)
    }
  } catch (error) {
    log('GET /api/tenants status filter', false, String(error))
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Test Summary')
  console.log('='.repeat(60))
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`)

  if (failed > 0) {
    console.log('\n❌ Failed Tests:')
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`   - ${r.test}`)
        if (r.error) console.log(`     ${r.error}`)
      })
    process.exit(1)
  } else {
    console.log('\n🎉 All tests passed!')
    process.exit(0)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
