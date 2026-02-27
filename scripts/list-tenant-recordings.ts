/**
 * List all recordings in tenant_1 folder
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listTenantRecordings() {
  console.log('\n📁 Checking recordings in tenant_1 folder...\n')

  const { data: files, error } = await supabase.storage
    .from('recordings')
    .list('tenant_1', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' }
    })

  if (error) {
    console.error('❌ Error listing recordings:', error)
    return
  }

  if (!files || files.length === 0) {
    console.log('📭 No recordings found in tenant_1 folder')
    return
  }

  console.log(`✅ Found ${files.length} recording(s) in tenant_1:\n`)

  for (const file of files) {
    const sizeInMB = file.metadata?.size ? (file.metadata.size / 1024 / 1024).toFixed(2) : 'unknown'
    const createdAt = file.created_at ? new Date(file.created_at) : null
    const ageInDays = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) : null

    console.log(`┌─ File: ${file.name}`)
    console.log(`│  Size: ${sizeInMB} MB`)
    console.log(`│  Created: ${createdAt ? createdAt.toLocaleString() : 'unknown'}`)
    console.log(`│  Age: ${ageInDays !== null ? `${ageInDays} days ago` : 'unknown'}`)
    console.log(`│  Type: ${file.metadata?.mimetype || 'unknown'}`)
    console.log('└─\n')
  }
}

listTenantRecordings()
