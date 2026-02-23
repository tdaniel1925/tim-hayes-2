import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase/admin'
import * as readline from 'readline'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve))
}

async function createSuperAdmin() {
  console.log('='.repeat(60))
  console.log('AudiaPro - Create Super Admin User')
  console.log('='.repeat(60))
  console.log()

  const email = await question('Enter super admin email: ')
  const password = await question('Enter password (min 6 chars): ')
  const fullName = await question('Enter full name: ')

  if (!email || !password || password.length < 6) {
    console.error('❌ Error: Email and password (min 6 chars) are required')
    rl.close()
    return
  }

  console.log()
  console.log('Creating super admin user...')
  console.log()

  try {
    const supabase = createAdminClient()

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('❌ Error creating auth user:', authError.message)
      rl.close()
      return
    }

    // Create user in users table
    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      role: 'super_admin',
      full_name: fullName,
      is_active: true,
      tenant_id: null,
    })

    if (userError) {
      console.error('❌ Error creating user record:', userError.message)
      // Cleanup: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      rl.close()
      return
    }

    console.log('✅ Super admin user created successfully!')
    console.log()
    console.log('Credentials:')
    console.log(`  Email: ${email}`)
    console.log(`  Password: ${password}`)
    console.log(`  Role: super_admin`)
    console.log()
    console.log('You can now login at: http://localhost:2900/login')
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }

  rl.close()
}

createSuperAdmin()
