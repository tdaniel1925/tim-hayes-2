/**
 * Check all recordings in Supabase storage
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkStorageRecordings() {
  console.log('\n📁 Checking all recordings in storage...\n')

  // List all files in recordings bucket
  const { data: files, error } = await supabase.storage
    .from('recordings')
    .list('', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' }
    })

  if (error) {
    console.error('❌ Error listing recordings:', error)
    return
  }

  if (!files || files.length === 0) {
    console.log('📭 No recordings found in storage')
    return
  }

  console.log(`✅ Found ${files.length} file(s) in recordings storage:\n`)

  for (const file of files) {
    const sizeInMB = file.metadata?.size ? (file.metadata.size / 1024 / 1024).toFixed(2) : 'unknown'
    const createdAt = file.created_at ? new Date(file.created_at).toLocaleString() : 'unknown'
    const updatedAt = file.updated_at ? new Date(file.updated_at).toLocaleString() : 'unknown'

    console.log(`┌─ File: ${file.name}`)
    console.log(`│  Size: ${sizeInMB} MB`)
    console.log(`│  Created: ${createdAt}`)
    console.log(`│  Updated: ${updatedAt}`)
    console.log(`│  Type: ${file.metadata?.mimetype || 'unknown'}`)
    console.log('└─\n')
  }

  // Check if there are folders
  const { data: folders, error: folderError } = await supabase.storage
    .from('recordings')
    .list('', {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' }
    })

  if (!folderError && folders) {
    const folderNames = folders.filter(f => f.id === null).map(f => f.name)
    if (folderNames.length > 0) {
      console.log(`\n📂 Found ${folderNames.length} folder(s):`)
      for (const folderName of folderNames) {
        console.log(`  - ${folderName}`)

        // List files in this folder
        const { data: folderFiles } = await supabase.storage
          .from('recordings')
          .list(folderName, {
            limit: 10,
            sortBy: { column: 'created_at', order: 'desc' }
          })

        if (folderFiles && folderFiles.length > 0) {
          console.log(`    Contains ${folderFiles.length} file(s)`)
        }
      }
    }
  }
}

checkStorageRecordings()
