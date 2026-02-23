-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule job processing via Supabase Edge Function
-- Runs every 5 seconds to process pending jobs
SELECT cron.schedule(
  'process-jobs',                           -- job name
  '*/5 * * * * *',                          -- every 5 seconds (note: pg_cron may need to support seconds, otherwise use '* * * * *' for every minute)
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/process-jobs',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Alternative: If pg_cron doesn't support seconds, use every minute
-- SELECT cron.schedule(
--   'process-jobs',
--   '* * * * *',  -- every minute
--   $$
--     SELECT net.http_post(
--       url := current_setting('app.supabase_url') || '/functions/v1/process-jobs',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'),
--         'Content-Type', 'application/json'
--       ),
--       body := '{}'::jsonb
--     );
--   $$
-- );

-- Set Supabase URL and anon key as runtime settings
-- These should be configured via Supabase Dashboard or CLI:
--   ALTER DATABASE postgres SET app.supabase_url = 'https://xxx.supabase.co';
--   ALTER DATABASE postgres SET app.supabase_anon_key = 'your-anon-key';

-- To view scheduled cron jobs:
-- SELECT * FROM cron.job;

-- To remove the cron job:
-- SELECT cron.unschedule('process-jobs');

-- To manually test the Edge Function:
-- SELECT net.http_post(
--   url := 'https://xxx.supabase.co/functions/v1/process-jobs',
--   headers := '{"Authorization": "Bearer your-anon-key", "Content-Type": "application/json"}'::jsonb,
--   body := '{}'::jsonb
-- );
