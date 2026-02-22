# Supabase Setup for AudiaPro

## Option 1: Link to Supabase Cloud Project (Recommended for Production)

1. Create a Supabase project at https://supabase.com
2. Link your project:
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
3. Push migrations:
   ```bash
   npx supabase db push
   ```
4. Create storage buckets (see below)
5. Copy connection details to `.env.local`

## Option 2: Use Local Supabase (Development)

1. Start local Supabase:
   ```bash
   npx supabase start
   ```
   This will output:
   - API URL (for NEXT_PUBLIC_SUPABASE_URL)
   - Anon key (for NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Service role key (for SUPABASE_SERVICE_ROLE_KEY)

2. Migrations are automatically applied on start

3. Access Studio at http://localhost:54323

## Storage Buckets (Required for both options)

Create these 3 private buckets via Supabase Studio:

1. **call-recordings** (private)
   - File size limit: 50MB
   - Allowed MIME types: audio/wav, audio/mpeg, audio/mp3

2. **call-transcripts** (private)
   - File size limit: 5MB
   - Allowed MIME types: application/json

3. **call-analyses** (private)
   - File size limit: 2MB
   - Allowed MIME types: application/json

## Environment Variables

After setup, copy `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=<from supabase project>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase project>
SUPABASE_SERVICE_ROLE_KEY=<from supabase project>
```

## Verify Migration

After pushing, verify all 6 tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- call_analyses
- cdr_records
- job_queue
- pbx_connections
- tenants
- users
