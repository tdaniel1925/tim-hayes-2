import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase/admin'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

async function ensureSuperAdmin() {
  const supabase = createAdminClient()
  const email = 'admin@audiapro.com'
  const password = 'admin123'

  console.log('Checking for super admin user...')

  try {
    // Check if user exists in auth
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers()
    const existingAuthUser = existingAuthUsers?.users?.find((u) => u.email === email)

    if (existingAuthUser) {
      console.log('✅ Super admin already exists:', email)
      console.log('   Password: admin123')
      return
    }

    // Create super admin user in Supabase Auth
    console.log('Creating super admin user...')
    const { data: superAdminAuth, error: superAdminAuthError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (superAdminAuthError) {
      console.error('❌ Error creating super admin auth:', superAdminAuthError.message)
      return
    }

    // Create super admin user in users table
    const { error: superAdminUserError } = await supabase.from('users').insert({
      id: superAdminAuth.user.id,
      email,
      role: 'super_admin',
      full_name: 'Super Admin',
      is_active: true,
      tenant_id: null,
    })

    if (superAdminUserError) {
      console.error('❌ Error creating super admin user:', superAdminUserError.message)
      // Cleanup
      await supabase.auth.admin.deleteUser(superAdminAuth.user.id)
      return
    }

    console.log('✅ Super admin created:', email)
    console.log('   Password:', password)
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

ensureSuperAdmin()
