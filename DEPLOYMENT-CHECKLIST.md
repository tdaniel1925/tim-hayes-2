# AudiaPro Deployment Checklist

Use this checklist to ensure a smooth deployment to production.

---

## Pre-Deployment

### 1. Code & Build
- [ ] All tests passing (`npm run test`)
- [ ] Build succeeds without errors (`npm run build`)
- [ ] No TypeScript errors
- [ ] All environment variables documented

### 2. Database
- [ ] All migrations created and tested locally
- [ ] RLS policies verified
- [ ] Storage buckets created
- [ ] Test data seeded and verified

### 3. API Keys & Credentials
- [ ] Deepgram API key obtained
- [ ] Anthropic API key obtained
- [ ] Resend API key obtained
- [ ] Encryption key generated (64-char hex)
- [ ] Super admin credentials prepared

---

## Supabase Setup

### 4. Create Production Project
- [ ] New Supabase project created
- [ ] Database password saved securely
- [ ] Project URL noted
- [ ] Anon key noted
- [ ] Service role key noted (keep secret!)

### 5. Link & Push Migrations
- [ ] Project linked: `npx supabase link --project-ref <ref>`
- [ ] Migrations pushed: `npx supabase db push`
- [ ] Verify tables exist in Dashboard → Database → Tables
- [ ] Verify functions exist: `SELECT * FROM pg_proc WHERE proname LIKE 'claim%';`

### 6. Configure Database Settings
- [ ] Set `app.supabase_url` in database
- [ ] Set `app.supabase_anon_key` in database
- [ ] Verify: `SHOW app.supabase_url;`

### 7. Create Super Admin
- [ ] Run `npm run tsx scripts/create-super-admin.ts` with production env
- [ ] Super admin login tested

### 8. Deploy Edge Function
- [ ] Supabase CLI installed
- [ ] Logged in: `npx supabase login`
- [ ] Edge Function deployed: `npx supabase functions deploy process-jobs`
- [ ] Secrets set: `npx supabase secrets set ENCRYPTION_KEY=... DEEPGRAM_API_KEY=... ANTHROPIC_API_KEY=...`
- [ ] Edge Function manually tested via curl
- [ ] Edge Function logs checked (no errors)

### 9. Verify Cron Jobs
- [ ] pg_cron extension enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
- [ ] process-jobs cron exists: `SELECT * FROM cron.job WHERE jobname = 'process-jobs';`
- [ ] weekly-reports cron exists: `SELECT * FROM cron.job WHERE jobname = 'weekly-reports';`
- [ ] pg_net extension enabled for HTTP requests

---

## Vercel Setup

### 10. Create Vercel Project
- [ ] GitHub repository connected
- [ ] Framework preset: Next.js
- [ ] Root directory: `./`
- [ ] Build command: `npm run build`
- [ ] Output directory: `.next`

### 11. Configure Environment Variables
- [ ] `NEXT_PUBLIC_APP_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (secret)
- [ ] `ENCRYPTION_KEY` set (same as Edge Function!)
- [ ] `DEEPGRAM_API_KEY` set (secret)
- [ ] `ANTHROPIC_API_KEY` set (secret)
- [ ] `RESEND_API_KEY` set (secret)
- [ ] `RESEND_FROM_EMAIL` set

### 12. Deploy to Vercel
- [ ] Deployment triggered
- [ ] Build succeeded (check logs)
- [ ] No build errors
- [ ] Deployment URL accessible

---

## Post-Deployment Verification

### 13. Frontend Tests
- [ ] Visit Vercel URL
- [ ] Login page renders
- [ ] Login with super admin works
- [ ] Dashboard loads
- [ ] Navigation works
- [ ] No console errors

### 14. Edge Function Tests
- [ ] Manually invoke Edge Function via curl
- [ ] Returns `{"success": true, ...}`
- [ ] Check logs in Supabase Dashboard
- [ ] No errors in logs

### 15. Full Pipeline Test
- [ ] Create test tenant via admin dashboard
- [ ] Create PBX connection (use mock/test credentials)
- [ ] Send test webhook to trigger job
- [ ] Verify job created in database: `SELECT * FROM job_queue ORDER BY created_at DESC LIMIT 1;`
- [ ] Wait for cron or manually invoke Edge Function
- [ ] Verify job status = 'completed'
- [ ] Verify call analysis exists: `SELECT * FROM call_analyses ORDER BY created_at DESC LIMIT 1;`
- [ ] View call in dashboard

### 16. Email Report Test
- [ ] Trigger manual email report via API
- [ ] Verify email received
- [ ] Email template renders correctly
- [ ] Unsubscribe link works

### 17. Security Verification
- [ ] RLS policies enforced (test as non-admin user)
- [ ] Storage buckets are private
- [ ] PBX credentials encrypted in database
- [ ] Service role key not exposed in client code
- [ ] HTTPS enforced on all endpoints

### 18. Performance Tests
- [ ] Pages load < 2 seconds
- [ ] API routes respond < 1 second
- [ ] No memory leaks in Edge Function
- [ ] Database queries optimized

---

## Monitoring Setup

### 19. Configure Monitoring
- [ ] Vercel monitoring enabled
- [ ] Supabase alerts configured (database CPU, storage)
- [ ] Edge Function alerts configured (errors, timeouts)
- [ ] Uptime monitoring configured (e.g., Uptime Robot)

### 20. Log Verification
- [ ] Vercel logs accessible
- [ ] Supabase Edge Function logs accessible
- [ ] Database logs accessible
- [ ] No unexpected errors in logs

---

## Documentation

### 21. Update Documentation
- [ ] DEPLOYMENT.md reviewed and accurate
- [ ] Environment variables documented
- [ ] Super admin credentials saved in password manager
- [ ] Supabase project details documented
- [ ] Vercel deployment URL documented

---

## Backup & Disaster Recovery

### 22. Backup Setup
- [ ] Supabase automatic backups enabled (Pro tier)
- [ ] Manual backup tested: `npx supabase db dump`
- [ ] Storage backup strategy documented
- [ ] Recovery procedure documented

---

## Final Checklist

### 23. Go Live
- [ ] All above items checked
- [ ] Team notified of deployment
- [ ] Custom domain configured (if applicable)
- [ ] DNS updated (if applicable)
- [ ] SSL certificate verified
- [ ] Production URL shared with stakeholders

### 24. Post-Launch Monitoring
- [ ] Monitor logs for first 24 hours
- [ ] Monitor error rates
- [ ] Monitor API usage (Deepgram, Anthropic)
- [ ] Monitor storage growth
- [ ] Monitor database performance

---

## Rollback Plan

If something goes wrong:

1. **Vercel:**
   - Go to Deployments → Previous deployment → Promote to Production

2. **Supabase Edge Function:**
   - Redeploy previous version: `npx supabase functions deploy process-jobs@<previous-version>`

3. **Database:**
   - Restore from backup (Supabase Dashboard → Database → Backups)

4. **Cron Jobs:**
   - Disable: `SELECT cron.unschedule('process-jobs');`
   - Re-enable after fix

---

## Support Contacts

- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** https://supabase.com/support
- **Deepgram Support:** https://developers.deepgram.com/
- **Anthropic Support:** https://docs.anthropic.com/

---

**Deployment Date:** _________________

**Deployed By:** _________________

**Production URL:** _________________

**Notes:**
