-- Enable pg_cron extension (may require Supabase platform support)
-- Note: pg_cron is available on Supabase Pro tier and above
-- If not available, use Render cron job instead (see render-cron.yaml)

-- Create extension if not exists (no-op if already exists)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function that can be called by cron to trigger weekly reports
-- This function will make an HTTP request to the Next.js API endpoint
CREATE OR REPLACE FUNCTION trigger_weekly_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the cron job execution
  RAISE NOTICE 'Weekly report cron job triggered at %', NOW();

  -- Note: This function is a placeholder for cron job setup
  -- The actual email sending is handled by the Next.js API endpoint
  -- You'll need to configure an external cron service (like Render Cron Jobs)
  -- to call: POST https://your-domain.com/api/admin/reports/weekly/send
END;
$$;

-- Schedule weekly reports to run every Monday at 8:00 AM UTC
-- Syntax: minute hour day-of-month month day-of-week
-- This runs every Monday (day 1) at 08:00 UTC
SELECT cron.schedule(
  'weekly-reports',           -- job name
  '0 8 * * 1',                -- cron expression: 8 AM every Monday
  $$SELECT trigger_weekly_reports()$$
);

-- To view scheduled cron jobs:
-- SELECT * FROM cron.job;

-- To remove the cron job:
-- SELECT cron.unschedule('weekly-reports');

-- Alternative: Use Render Cron Jobs
-- If pg_cron is not available, set up a Render cron job that calls:
-- curl -X POST https://your-domain.com/api/admin/reports/weekly/send \
--   -H "Authorization: Bearer YOUR_CRON_SECRET" \
--   -H "Content-Type: application/json"
