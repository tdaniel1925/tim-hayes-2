# AudiaPro Deployment Guide

This guide covers deploying AudiaPro to production using **Vercel** (frontend) and **Supabase** (database, storage, Edge Functions).

---

## Architecture Overview

```
┌──────────────┐
│    Vercel    │  ← Next.js app (frontend + API routes)
└──────┬───────┘
       │
       ├─→ Supabase PostgreSQL (database)
       ├─→ Supabase Storage (call recordings)
       ├─→ Supabase Edge Functions (background worker)
       │   └─→ pg_cron triggers every 5 seconds
       ├─→ Deepgram API (transcription)
       ├─→ Anthropic Claude API (analysis)
       └─→ Resend API (email reports)
```

---

## Prerequisites

- [ ] Supabase project created (production)
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Vercel account
- [ ] Deepgram API key
- [ ] Anthropic API key
- [ ] Resend API key (for email reports)
- [ ] GitHub repository connected

---

## 1. Supabase Production Setup

### 1.1 Create Production Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and region (pick closest to your users)
4. Set database password (save it securely!)
5. Wait for project to provision (~2 minutes)
6. Note down from Settings → API:
   - Project URL: `https://xxx.supabase.co`
   - Anon/Public Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Service Role Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ⚠️ **Keep this secret!**

### 1.2 Link Local Project to Production

```bash
# Link to production project
npx supabase link --project-ref <your-project-ref>

# You'll be prompted for your database password
```

### 1.3 Push Database Migrations

```bash
# Push all migrations to production
npx supabase db push
```

This will create all tables, indexes, RLS policies, and functions.

### 1.4 Configure Database Settings for Edge Functions

Run this SQL in the Supabase SQL Editor to configure runtime settings for pg_cron:

```sql
-- Set Supabase URL (replace with your project URL)
ALTER DATABASE postgres SET app.supabase_url = 'https://xxx.supabase.co';

-- Set Supabase anon key (replace with your anon key)
ALTER DATABASE postgres SET app.supabase_anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### 1.5 Create Super Admin User

```bash
# Run locally with production credentials in .env.local
npm run tsx scripts/create-super-admin.ts
```

Enter your super admin email and password when prompted.

---

## 2. Supabase Edge Functions Deployment

### 2.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 2.2 Login to Supabase

```bash
npx supabase login
```

### 2.3 Deploy Edge Function

```bash
# Deploy the process-jobs Edge Function
npx supabase functions deploy process-jobs \
  --project-ref <your-project-ref> \
  --no-verify-jwt

# Set environment variables for Edge Function
npx supabase secrets set \
  --project-ref <your-project-ref> \
  ENCRYPTION_KEY=<your-64-char-hex-key> \
  DEEPGRAM_API_KEY=<your-deepgram-key> \
  ANTHROPIC_API_KEY=<your-anthropic-key>
```

**Generate Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.4 Test Edge Function

```bash
# Invoke the function manually
curl -X POST "https://xxx.supabase.co/functions/v1/process-jobs" \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

You should see a response like:
```json
{
  "success": true,
  "processedJobs": 0,
  "failedJobs": 0,
  "timestamp": "2026-02-23T08:30:00.000Z"
}
```

---

## 3. Vercel Deployment (Frontend)

### 3.1 Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Framework Preset: **Next.js**
5. Root Directory: `./` (root)
6. Build Command: `npm run build`
7. Output Directory: `.next`

### 3.2 Configure Environment Variables

Add these in Vercel Project Settings → Environment Variables:

**Public Variables:**
```
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Secret Variables:**
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ENCRYPTION_KEY=<64-character-hex-string>
DEEPGRAM_API_KEY=<your-deepgram-key>
ANTHROPIC_API_KEY=<your-anthropic-key>
RESEND_API_KEY=<your-resend-key>
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

⚠️ **Important:** Use the **same** `ENCRYPTION_KEY` for both Vercel and Supabase Edge Functions!

### 3.3 Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Verify deployment at your Vercel URL
4. Test login with super admin credentials

---

## 4. Weekly Email Reports Setup

The weekly email reports are automatically configured via the migration `20260223000000_weekly_report_cron.sql`.

### 4.1 Verify Cron Job

Run this SQL in Supabase SQL Editor:

```sql
-- View all scheduled cron jobs
SELECT * FROM cron.job WHERE jobname = 'weekly-reports';
```

You should see a job scheduled to run every Monday at 8:00 AM UTC.

### 4.2 Manual Test

Trigger a weekly report manually:

```bash
curl -X POST "https://your-domain.vercel.app/api/admin/reports/weekly/send" \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-auth-cookie>"
```

Check recipient inbox for the email.

---

## 5. Post-Deployment Verification

### 5.1 Frontend Checks

- [ ] Visit `https://your-domain.vercel.app`
- [ ] Login page renders correctly
- [ ] Login with super admin works
- [ ] Dashboard loads without errors
- [ ] All navigation links work

### 5.2 Edge Function Checks

```bash
# Manually invoke the Edge Function
curl -X POST "https://xxx.supabase.co/functions/v1/process-jobs" \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Should return `{"success": true, ...}`

### 5.3 Cron Job Checks

```sql
-- View cron job history (if supported)
SELECT * FROM cron.job_run_details WHERE jobid IN (
  SELECT jobid FROM cron.job WHERE jobname = 'process-jobs'
)
ORDER BY start_time DESC
LIMIT 10;
```

### 5.4 Full Pipeline Test

1. **Create a test tenant** via super admin dashboard
2. **Create a PBX connection** with test credentials
3. **Send a test webhook:**
   ```bash
   curl -X POST "https://your-domain.vercel.app/api/webhook/grandstream/<connection-id>" \
     -H "Content-Type: application/json" \
     -d '{
       "event": "call.completed",
       "uniqueid": "TEST-001",
       "linkedid": "TEST-001",
       "callid": "001",
       "src": "+1-555-0101",
       "dst": "+1-555-0202",
       "duration": "120",
       "billsec": "120",
       "disposition": "ANSWERED",
       "recordingfile": "test-recording.wav"
     }'
   ```
4. **Check job was created** in the Jobs page
5. **Wait for cron** (up to 5 seconds) or manually invoke Edge Function
6. **Verify job completes** (status: completed)
7. **View call in dashboard** with analysis

---

## 6. Environment Variables Reference

### Frontend (Vercel)

| Variable | Required | Secret | Description |
|----------|----------|--------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes | No | Your Vercel app URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | No | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | No | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Yes | Supabase service role key |
| `ENCRYPTION_KEY` | Yes | Yes | 64-char hex string for AES-256-GCM |
| `DEEPGRAM_API_KEY` | Yes | Yes | Deepgram API key |
| `ANTHROPIC_API_KEY` | Yes | Yes | Anthropic Claude API key |
| `RESEND_API_KEY` | Yes | Yes | Resend email API key |
| `RESEND_FROM_EMAIL` | Yes | No | From email address |

### Edge Function (Supabase)

| Variable | Required | Description |
|----------|----------|-------------|
| `ENCRYPTION_KEY` | Yes | Same as Vercel (64-char hex) |
| `DEEPGRAM_API_KEY` | Yes | Deepgram API key |
| `ANTHROPIC_API_KEY` | Yes | Anthropic Claude API key |
| `WORKER_MAX_CONCURRENT_JOBS` | No | Max concurrent jobs (default: 3) |

**Set via Supabase CLI:**
```bash
npx supabase secrets set ENCRYPTION_KEY=xxx DEEPGRAM_API_KEY=yyy ANTHROPIC_API_KEY=zzz --project-ref <your-project-ref>
```

---

## 7. Monitoring & Troubleshooting

### Vercel Logs

View real-time logs:
```bash
vercel logs <your-deployment-url>
```

Or view in Vercel Dashboard → Deployments → Logs

### Supabase Edge Function Logs

1. Go to Supabase Dashboard
2. Select your project
3. Click "Edge Functions" → "process-jobs"
4. View "Logs" tab

### Database Logs

1. Go to Supabase Dashboard
2. Click "Database" → "Logs"
3. Filter by severity or search for errors

### Common Issues

**Issue: Edge Function not processing jobs**
- Check Edge Function logs in Supabase Dashboard
- Verify environment variables are set correctly:
  ```bash
  npx supabase secrets list --project-ref <your-project-ref>
  ```
- Verify encryption key matches Vercel
- Test manually: `curl -X POST https://xxx.supabase.co/functions/v1/process-jobs ...`

**Issue: Cron not triggering Edge Function**
- Verify pg_cron extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
- Verify cron job exists: `SELECT * FROM cron.job WHERE jobname = 'process-jobs';`
- Check database settings: `SHOW app.supabase_url;` and `SHOW app.supabase_anon_key;`
- Manually trigger: `SELECT net.http_post(...);`

**Issue: Recordings fail to download**
- Check PBX connection credentials are correct
- Verify PBX is publicly accessible or allows Supabase IP ranges
- Check SSL verification (`verify_ssl: false` for self-signed certs)

**Issue: Transcription fails**
- Verify `DEEPGRAM_API_KEY` is valid
- Check Deepgram usage limits
- Verify audio file format is supported (WAV, MP3)

**Issue: Analysis fails**
- Verify `ANTHROPIC_API_KEY` is valid
- Check Claude API usage limits
- Verify transcript is not empty

---

## 8. Security Checklist

- [ ] All secret keys are stored as environment variables
- [ ] `ENCRYPTION_KEY` is 64 characters (32 bytes hex)
- [ ] Same `ENCRYPTION_KEY` used on Vercel and Edge Functions
- [ ] Supabase RLS policies are enabled
- [ ] PBX credentials are encrypted in database
- [ ] Webhook endpoints validate connection ID
- [ ] Storage buckets are private (not public)
- [ ] HTTPS enforced on all endpoints
- [ ] Service Role Key never exposed to client-side code

---

## 9. Cost Estimates

**Vercel:**
- Hobby plan: Free (sufficient for small workloads)
- Pro plan: $20/month (for production use)

**Supabase:**
- Free tier: $0 (500MB database, 1GB storage, 2GB bandwidth)
- Pro tier: $25/month (8GB database, 100GB storage, 250GB bandwidth, pg_cron)
- Edge Functions: Free (2M requests/month), then $2/1M requests

**Deepgram:**
- Pay-as-you-go: $0.0043/minute (Nova-2 model)
- Example: 1000 minutes/month = $4.30

**Anthropic Claude:**
- Pay-as-you-go: ~$0.01/call (depending on transcript length)
- Example: 1000 calls/month = $10

**Resend:**
- Free tier: 100 emails/day, 3,000/month
- Pro: $20/month for 50,000 emails/month

**Total (small workload):**
- Minimum: ~$0/month (all free tiers)
- Production: ~$60-80/month (all paid tiers)

---

## 10. Scaling Considerations

**When to scale:**
- Edge Function execution time > 100s
- Job queue backlog > 100 jobs
- API response times > 2 seconds

**How to scale:**

1. **Increase cron frequency:**
   - Change from every 5 seconds to every second
   - Or trigger Edge Function on job insert via database trigger

2. **Increase concurrent jobs:**
   - Update `WORKER_MAX_CONCURRENT_JOBS` from 3 to 5 or 10

3. **Database scaling:**
   - Upgrade Supabase tier (Pro → Team → Enterprise)
   - Add read replicas for analytics queries

4. **Storage optimization:**
   - Compress WAV → MP3 (50-70% size reduction)
   - Implement retention policy (delete old recordings)

---

## 11. Backup & Disaster Recovery

### Database Backups

Supabase Pro tier includes:
- Daily automatic backups (7-day retention)
- Point-in-time recovery (PITR)

### Manual Backup

```bash
# Export database
npx supabase db dump -f backup.sql

# Restore database
psql -h db.xxx.supabase.co -U postgres -d postgres -f backup.sql
```

### Storage Backups

Use Supabase Storage API to download all recordings:

```bash
# List all files in a bucket
npx supabase storage list call-recordings

# Download files programmatically via API
```

---

## Support

**Vercel:** https://vercel.com/support
**Supabase:** https://supabase.com/support
**Deepgram:** https://developers.deepgram.com/
**Anthropic:** https://docs.anthropic.com/

For AudiaPro-specific issues:
- Check logs in Vercel and Supabase dashboards
- Review error messages in Edge Function logs
- Verify environment variables are correct
