-- Fix users_view_self policy to allow reading own record regardless of is_active
-- This allows the login page to read the user record and check if they're active
-- The application code will enforce the is_active check

DROP POLICY IF EXISTS "users_view_self" ON users;

CREATE POLICY "users_view_self" ON users FOR SELECT USING (
    id = auth.uid()
);
