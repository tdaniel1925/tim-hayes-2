-- Row Level Security (RLS) Policies for AudiaPro
-- Version: 1.0
-- Date: 2026-02-22

-- Enable RLS on all tables (should already be enabled, but ensuring)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pbx_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdr_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SUPER ADMIN POLICIES (full access to all tables)
-- =============================================================================

CREATE POLICY "super_admin_all_tenants" ON tenants FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true)
);

CREATE POLICY "super_admin_all_users" ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true)
);

CREATE POLICY "super_admin_all_pbx_connections" ON pbx_connections FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true)
);

CREATE POLICY "super_admin_all_cdr_records" ON cdr_records FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true)
);

CREATE POLICY "super_admin_all_call_analyses" ON call_analyses FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true)
);

CREATE POLICY "super_admin_all_job_queue" ON job_queue FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true)
);

-- =============================================================================
-- TENANT-SCOPED POLICIES (client admins, managers, viewers)
-- =============================================================================

-- Tenants: users can view their own tenant
CREATE POLICY "tenants_view_own" ON tenants FOR SELECT USING (
    id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid() AND users.is_active = true)
);

-- Users: users can view their own profile
CREATE POLICY "users_view_self" ON users FOR SELECT USING (
    id = auth.uid() AND is_active = true
);

-- PBX Connections: tenant users can view their tenant's connections
CREATE POLICY "pbx_connections_tenant_select" ON pbx_connections FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid() AND users.is_active = true)
);

-- CDR Records: tenant users can view their tenant's calls
CREATE POLICY "cdr_records_tenant_select" ON cdr_records FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid() AND users.is_active = true)
);

-- Call Analyses: tenant users can view their tenant's analyses
CREATE POLICY "call_analyses_tenant_select" ON call_analyses FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid() AND users.is_active = true)
);

-- Job Queue: tenant admins can view their tenant's jobs
CREATE POLICY "job_queue_tenant_select" ON job_queue FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid() AND users.is_active = true)
);

-- =============================================================================
-- NOTES
-- =============================================================================
-- Service role (worker) bypasses RLS automatically
-- Webhook handler uses service role to create CDR records
-- All tenant-scoped policies check is_active to prevent suspended users from accessing data
