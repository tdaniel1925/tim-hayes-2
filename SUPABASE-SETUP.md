# Supabase Cloud Setup Instructions

Follow these steps to set up your AudiaPro Supabase project:

## Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name:** AudiaPro (or your preferred name)
   - **Database Password:** Generate a strong password (SAVE THIS!)
   - **Region:** Choose closest to your location
   - **Pricing Plan:** Free tier is fine for development
4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning

## Step 2: Get Project Reference ID

Once your project is created:

1. In the Supabase Dashboard, look at the URL:
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_REF
                                          ^^^^^^^^^^^^^^^^
   ```
   Copy the `YOUR_PROJECT_REF` part (it looks like: `abcdefghijklmnop`)

2. Or find it in **Settings → General → Reference ID**

## Step 3: Link Project to Local Code

Open your terminal in the AudiaPro directory and run:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

When prompted:
- **Database password:** Enter the password you set in Step 1

## Step 4: Push Database Migrations

Run:

```bash
npx supabase db push
```

This will create all 6 tables, indexes, functions, and triggers.

You should see output like:
```
Applying migration 20260222000000_initial_schema.sql...
Finished supabase db push.
```

## Step 5: Get API Credentials

1. In Supabase Dashboard, go to **Settings → API**
2. Copy these values:

   - **Project URL** → This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (click "Reveal" button) → This is your `SUPABASE_SERVICE_ROLE_KEY`

## Step 6: Create .env.local File

Create a file named `.env.local` in your project root with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database (optional - Supabase provides this)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.YOUR_PROJECT_REF.supabase.co:5432/postgres

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# External APIs (leave as placeholder for now)
DEEPGRAM_API_KEY=xxx
ANTHROPIC_API_KEY=xxx

# Email (leave as placeholder for now)
RESEND_API_KEY=xxx
RESEND_FROM_EMAIL=noreply@audiapro.com

# Security (generate later in Step 1.5)
ENCRYPTION_KEY=xxx
```

## Step 7: Create Storage Buckets

1. In Supabase Dashboard, go to **Storage**
2. Click **"New bucket"** and create:

### Bucket 1: call-recordings
- **Name:** `call-recordings`
- **Public:** ❌ OFF (keep private)
- **File size limit:** 50 MB
- **Allowed MIME types:** Leave empty (we'll restrict in code)

### Bucket 2: call-transcripts
- **Name:** `call-transcripts`
- **Public:** ❌ OFF (keep private)
- **File size limit:** 5 MB

### Bucket 3: call-analyses
- **Name:** `call-analyses`
- **Public:** ❌ OFF (keep private)
- **File size limit:** 2 MB

## Step 8: Verify Setup

In Supabase Dashboard:

1. Go to **Table Editor**
2. You should see 6 tables:
   - call_analyses
   - cdr_records
   - job_queue
   - pbx_connections
   - tenants
   - users

3. Go to **SQL Editor** and run:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```
   Should return 6 rows.

## Step 9: Tell Claude You're Ready

Once you've completed all steps above, tell me:

**"Supabase setup complete"**

And I'll verify the migration and continue with Step 1.3: RLS Policies.

---

## Troubleshooting

**"Migration failed":**
- Check your database password is correct
- Try relinking: `npx supabase link --project-ref YOUR_PROJECT_REF`

**"Can't find project ref":**
- Look in your Supabase dashboard URL
- Or go to Settings → General → Reference ID

**"Missing API keys":**
- Go to Settings → API in your Supabase Dashboard
- Make sure to click "Reveal" for the service_role key
