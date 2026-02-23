"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from parent .env.local
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env.local') });
const PORT = process.env.WORKER_PORT || 3002;
const POLL_INTERVAL_MS = 5000; // 5 seconds
const STALE_JOB_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
// Supabase client (service role for worker operations)
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});
// Active jobs counter
let activeJobs = 0;
// Express app for health check
const app = (0, express_1.default)();
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        activeJobs,
        timestamp: new Date().toISOString(),
    });
});
// Reset stale jobs (jobs stuck in processing for >10 minutes)
async function resetStaleJobs() {
    try {
        const { data, error } = await supabase.rpc('reset_stale_jobs');
        if (error) {
            console.error('Error resetting stale jobs:', error);
            return 0;
        }
        const resetCount = data || 0;
        if (resetCount > 0) {
            console.log(`⚠️  Reset ${resetCount} stale job(s)`);
        }
        return resetCount;
    }
    catch (error) {
        console.error('Unexpected error resetting stale jobs:', error);
        return 0;
    }
}
// Claim and process the next job
async function claimAndProcessJob() {
    try {
        // Claim next job using the database function
        const { data: jobs, error } = await supabase.rpc('claim_next_job');
        if (error) {
            console.error('Error claiming job:', error);
            return false;
        }
        // If no job available, return false
        if (!jobs || jobs.length === 0) {
            return false;
        }
        const job = jobs[0];
        activeJobs++;
        console.log(`📋 Claimed job ${job.id} (attempt ${job.attempts}/${job.max_attempts})`);
        try {
            // TODO: Process the job (Steps 4.2-4.5 will implement this)
            // For now, just simulate processing
            console.log(`   Processing job type: ${job.job_type}`);
            console.log(`   CDR record: ${job.cdr_record_id}`);
            console.log(`   Tenant: ${job.tenant_id}`);
            // Simulate processing delay
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // TODO: Replace with actual pipeline execution
            console.log(`   ✅ Job ${job.id} completed (placeholder)`);
            return true;
        }
        catch (error) {
            console.error(`   ❌ Job ${job.id} failed:`, error);
            // Check if we've exceeded max attempts
            if (job.attempts >= job.max_attempts) {
                console.error(`   Max retries (${job.max_attempts}) reached, marking as failed`);
                // TODO: Mark job as failed using fail_job() function
            }
            else {
                console.log(`   Will retry (${job.attempts}/${job.max_attempts})`);
                // TODO: Reset job to pending for retry
            }
            return false;
        }
        finally {
            activeJobs--;
        }
    }
    catch (error) {
        console.error('Unexpected error processing job:', error);
        return false;
    }
}
// Main polling loop
async function startPolling() {
    console.log('🔄 Starting job polling loop (every 5s)...');
    // Poll continuously
    setInterval(async () => {
        await claimAndProcessJob();
    }, POLL_INTERVAL_MS);
    // Also try to claim a job immediately on startup
    await claimAndProcessJob();
}
// Start the worker
async function start() {
    console.log('='.repeat(60));
    console.log('🚀 AudiaPro Worker Starting...');
    console.log('='.repeat(60));
    console.log();
    // Reset stale jobs on startup
    console.log('🔧 Resetting stale jobs on startup...');
    const resetCount = await resetStaleJobs();
    if (resetCount === 0) {
        console.log('   No stale jobs found');
    }
    console.log();
    // Schedule periodic stale job resets
    setInterval(async () => {
        await resetStaleJobs();
    }, STALE_JOB_CHECK_INTERVAL_MS);
    // Start health check server
    app.listen(PORT, () => {
        console.log(`✅ Health check server running on http://localhost:${PORT}`);
        console.log(`   GET /health - Check worker status`);
        console.log();
    });
    // Start polling for jobs
    startPolling();
    console.log('✅ Worker initialized successfully');
    console.log();
}
// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down worker...');
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down worker...');
    process.exit(0);
});
// Start the worker
start().catch((error) => {
    console.error('💥 Failed to start worker:', error);
    process.exit(1);
});
