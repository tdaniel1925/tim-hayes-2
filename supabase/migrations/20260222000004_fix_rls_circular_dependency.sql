-- Fix circular dependency in ALL RLS policies
-- All policies were querying the users table from within RLS checks, causing infinite recursion
-- Solution: Create a SECURITY DEFINER function that bypasses RLS to get user info

-- Create a helper function that bypasses RLS to get user role and tenant
CREATE OR REPLACE FUNCTION public.get_user_info()
RETURNS TABLE (
    user_role TEXT,
    user_tenant_id UUID,
    user_is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT role::TEXT, tenant_id, is_active
    FROM public.users
    WHERE id = auth.uid();
END;
$$;

-- Drop ALL existing policies that have circular dependencies
DROP POLICY IF EXISTS "super_admin_all_tenants" ON tenants;
DROP POLICY IF EXISTS "super_admin_all_users" ON users;
DROP POLICY IF EXISTS "super_admin_all_pbx_connections" ON pbx_connections;
DROP POLICY IF EXISTS "super_admin_all_cdr_records" ON cdr_records;
DROP POLICY IF EXISTS "super_admin_all_call_analyses" ON call_analyses;
DROP POLICY IF EXISTS "super_admin_all_job_queue" ON job_queue;
DROP POLICY IF EXISTS "tenants_view_own" ON tenants;
DROP POLICY IF EXISTS "pbx_connections_tenant_select" ON pbx_connections;
DROP POLICY IF EXISTS "cdr_records_tenant_select" ON cdr_records;
DROP POLICY IF EXISTS "call_analyses_tenant_select" ON call_analyses;
DROP POLICY IF EXISTS "job_queue_tenant_select" ON job_queue;

-- Recreate policies using the SECURITY DEFINER function

-- =============================================================================
-- USERS TABLE POLICIES
-- =============================================================================
-- Users can read their own record (no circular dependency)
-- Keep the already-fixed users_view_self policy from previous migration

-- Super admins can manage all users
CREATE POLICY "super_admin_all_users" ON users FOR ALL USING (
    (SELECT user_role FROM public.get_user_info()) = 'super_admin'
    AND (SELECT user_is_active FROM public.get_user_info()) = true
);

-- =============================================================================
-- TENANTS TABLE POLICIES
-- =============================================================================
CREATE POLICY "super_admin_all_tenants" ON tenants FOR ALL USING (
    (SELECT user_role FROM public.get_user_info()) = 'super_admin'
    AND (SELECT user_is_active FROM public.get_user_info()) = true
);

CREATE POLICY "tenants_view_own" ON tenants FOR SELECT USING (
    id = (SELECT user_tenant_id FROM public.get_user_info())
    AND (SELECT user_is_active FROM public.get_user_info()) = true
);

-- =============================================================================
-- PBX CONNECTIONS POLICIES
-- =============================================================================
CREATE POLICY "super_admin_all_pbx_connections" ON pbx_connections FOR ALL USING (
    (SELECT user_role FROM public.get_user_info()) = 'super_admin'
    AND (SELECT user_is_active FROM public.get_user_info()) = true
);

CREATE POLICY "pbx_connections_tenant_select" ON pbx_connections FOR SELECT USING (
    tenant_id = (SELECT user_tenant_id FROM public.get_user_info())
    AND (SELECT user_is_active FROM public.get_user_info()) = true
);

-- =============================================================================
-- CDR RECORDS POLICIES
-- =============================================================================
CREATE POLICY "super_admin_all_cdr_records" ON cdr_records FOR ALL USING (
    (SELECT user_role FROM public.get_user_info()) = 'super_admin'
    AND (SELECT user_is_active FROM public.get_user_info()) = true
);

CREATE POLICY "cdr_records_tenant_select" ON cdr_records FOR SELECT USING (
    tenant_id = (SELECT user_tenant_id FROM public.get_user_info())
    AND (SELECT user_is_active FROM public.get_user_info()) = true
);

-- =============================================================================
-- CALL ANALYSES POLICIES
-- =============================================================================
CREATE POLICY "super_admin_all_call_analyses" ON call_analyses FOR ALL USING (
    (SELECT user_role FROM public.get_user_info()) = 'super_admin'
    AND (SELECT user_is_active FROM public.get_user_info()) = true
);

CREATE POLICY "call_analyses_tenant_select" ON call_analyses FOR SELECT USING (
    tenant_id = (SELECT user_tenant_id FROM public.get_user_info())
    AND (SELECT user_is_active FROM public.get_user_info()) = true
);

-- =============================================================================
-- JOB QUEUE POLICIES
-- =============================================================================
CREATE POLICY "super_admin_all_job_queue" ON job_queue FOR ALL USING (
    (SELECT user_role FROM public.get_user_info()) = 'super_admin'
    AND (SELECT user_is_active FROM public.get_user_info()) = true
);

CREATE POLICY "job_queue_tenant_select" ON job_queue FOR SELECT USING (
    tenant_id = (SELECT user_tenant_id FROM public.get_user_info())
    AND (SELECT user_is_active FROM public.get_user_info()) = true
);
