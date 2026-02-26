-- Fix pg_cron job to use hard-coded values instead of current_setting()
-- First, unschedule the existing job if it exists
SELECT cron.unschedule('process-jobs') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-jobs'
);

-- Schedule job processing via Supabase Edge Function
-- Runs every minute to process pending jobs (pg_cron standard doesn't support seconds)
SELECT cron.schedule(
  'process-jobs',
  '* * * * *',  -- every minute
  $$
    SELECT net.http_post(
      url := 'https://fcubjohwzfhjcwcnwost.supabase.co/functions/v1/process-jobs',
      headers := jsonb_build_object(
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjdWJqb2h3emZoamN3Y253b3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxOTMzMTAsImV4cCI6MjA4NTc2OTMxMH0.WQCFYX1CODvDDisCxD4qEAGXyZR5_A8DdeSDPgceqGM',
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
