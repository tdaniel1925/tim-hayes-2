/**
 * Import orphaned recordings by creating CDR records and job entries
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get tenant_id and connection_id for Acme Corp
const ACME_TENANT_ID = '038bf86c-19a0-4f0c-a061-c99b243d8018' // From the connection data
const ACME_CONNECTION_ID = 'e2d7e69b-9179-4824-b21c-53249f63fdc2'

async function importOrphanedRecordings() {
  console.log('\n📥 Importing orphaned recordings...\n')

  // Get all recordings from storage
  const { data: files, error: storageError } = await supabase.storage
    .from('recordings')
    .list('tenant_1', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'asc' }
    })

  if (storageError || !files || files.length === 0) {
    console.error('❌ Error listing recordings:', storageError)
    return
  }

  console.log(`Found ${files.length} recording files\n`)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const file of files) {
    try {
      // Parse filename to extract call info
      // Format: timestamp.000_auto-timestamp-ext-number.wav
      // Example: 1770662064.000_auto-1770662064-1000-9366417130.wav
      const filename = file.name
      const match = filename.match(/^(\d+)\.(?:\d+)_auto-\d+.*?-(\d+)\.wav$/)

      if (!match) {
        console.log(`⚠️  Skipping file with unexpected format: ${filename}`)
        skipped++
        continue
      }

      const timestamp = parseInt(match[1])
      const phoneNumber = match[2]

      // Convert Unix timestamp to ISO date
      const callDate = new Date(timestamp * 1000)

      // Generate unique ID from filename
      const uniqueid = `imported-${timestamp}-${phoneNumber}`

      // Check if CDR already exists
      const { data: existing } = await supabase
        .from('cdr_records')
        .select('id')
        .eq('uniqueid', uniqueid)
        .single()

      if (existing) {
        console.log(`↩️  Already imported: ${filename}`)
        skipped++
        continue
      }

      // Create CDR record
      const { data: cdrRecord, error: cdrError } = await supabase
        .from('cdr_records')
        .insert({
          tenant_id: ACME_TENANT_ID,
          pbx_connection_id: ACME_CONNECTION_ID,
          uniqueid: uniqueid,
          linkedid: uniqueid,
          src: phoneNumber.length > 10 ? phoneNumber.substring(phoneNumber.length - 10) : phoneNumber,
          dst: '1000', // Extension
          call_direction: 'inbound',
          start_time: callDate.toISOString(),
          answer_time: callDate.toISOString(),
          end_time: new Date(callDate.getTime() + 60000).toISOString(), // Assume 1 min duration
          duration_seconds: 60,
          billsec_seconds: 60,
          disposition: 'ANSWERED',
          recording_filename: filename,
          recording_storage_path: `tenant_1/${filename}`,
          processing_status: 'pending',
        })
        .select()
        .single()

      if (cdrError) {
        console.error(`❌ Error creating CDR for ${filename}:`, cdrError.message)
        errors++
        continue
      }

      // Create job to process this recording
      const { error: jobError } = await supabase
        .from('job_queue')
        .insert({
          tenant_id: ACME_TENANT_ID,
          cdr_record_id: cdrRecord.id,
          job_type: 'full_pipeline',
          status: 'pending',
          priority: 10,
          scheduled_for: new Date().toISOString(),
        })

      if (jobError) {
        console.error(`⚠️  Error creating job for ${filename}:`, jobError.message)
      }

      console.log(`✅ Imported: ${filename} → ${callDate.toLocaleString()}`)
      imported++

    } catch (error: any) {
      console.error(`❌ Error processing ${file.name}:`, error.message)
      errors++
    }
  }

  console.log(`\n📊 Import Summary:`)
  console.log(`   ✅ Imported: ${imported}`)
  console.log(`   ↩️  Skipped: ${skipped}`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log(`\n💡 Jobs created. Run the worker to process these recordings.`)
}

importOrphanedRecordings()
