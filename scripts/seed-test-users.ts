import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase/admin'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

async function seedTestUsers() {
  const supabase = createAdminClient()

  console.log('Creating test users...')

  try {
    // Create a test tenant first
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Test Company',
        slug: 'test-company',
        status: 'active',
      })
      .select()
      .single()

    if (tenantError) {
      console.error('Error creating tenant:', tenantError)
      return
    }

    console.log('✅ Created tenant:', tenant.id)

    // Create super admin user in Supabase Auth
    const { data: superAdminAuth, error: superAdminAuthError } =
      await supabase.auth.admin.createUser({
        email: 'admin@audiapro.com',
        password: 'admin123',
        email_confirm: true,
      })

    if (superAdminAuthError) {
      console.error('Error creating super admin auth:', superAdminAuthError)
    } else {
      // Create super admin user in users table
      const { error: superAdminUserError } = await supabase.from('users').insert({
        id: superAdminAuth.user.id,
        email: 'admin@audiapro.com',
        role: 'super_admin',
        full_name: 'Super Admin',
        is_active: true,
        tenant_id: null,
      })

      if (superAdminUserError) {
        console.error('Error creating super admin user:', superAdminUserError)
      } else {
        console.log('✅ Created super admin: admin@audiapro.com / admin123')
      }
    }

    // Create tenant admin user in Supabase Auth
    const { data: tenantAdminAuth, error: tenantAdminAuthError } =
      await supabase.auth.admin.createUser({
        email: 'client@test.com',
        password: 'client123',
        email_confirm: true,
      })

    if (tenantAdminAuthError) {
      console.error('Error creating tenant admin auth:', tenantAdminAuthError)
    } else {
      // Create tenant admin user in users table
      const { error: tenantAdminUserError } = await supabase.from('users').insert({
        id: tenantAdminAuth.user.id,
        email: 'client@test.com',
        role: 'tenant_admin',
        full_name: 'Test Client Admin',
        is_active: true,
        tenant_id: tenant.id,
      })

      if (tenantAdminUserError) {
        console.error('Error creating tenant admin user:', tenantAdminUserError)
      } else {
        console.log('✅ Created tenant admin: client@test.com / client123')
      }
    }

    // Create an inactive user for testing
    const { data: inactiveAuth, error: inactiveAuthError } =
      await supabase.auth.admin.createUser({
        email: 'inactive@test.com',
        password: 'inactive123',
        email_confirm: true,
      })

    if (inactiveAuthError) {
      console.error('Error creating inactive auth:', inactiveAuthError)
    } else {
      const { error: inactiveUserError } = await supabase.from('users').insert({
        id: inactiveAuth.user.id,
        email: 'inactive@test.com',
        role: 'viewer',
        full_name: 'Inactive User',
        is_active: false, // INACTIVE
        tenant_id: tenant.id,
      })

      if (inactiveUserError) {
        console.error('Error creating inactive user:', inactiveUserError)
      } else {
        console.log('✅ Created inactive user: inactive@test.com / inactive123')
      }
    }

    console.log('\n✅ Test users created successfully!')
    console.log('\nTest credentials:')
    console.log('  Super Admin: admin@audiapro.com / admin123')
    console.log('  Tenant Admin: client@test.com / client123')
    console.log('  Inactive User: inactive@test.com / inactive123 (should show "Account suspended")')
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

seedTestUsers()
