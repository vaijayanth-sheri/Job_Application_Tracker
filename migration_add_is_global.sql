-- ============================================
-- Migration: Add is_global to companies
-- ============================================

-- 1. Add the is_global column to the companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT true;

-- 2. Drop the old permissive select policy
DROP POLICY IF EXISTS "Anyone can view global companies" ON companies;

-- 3. Create the new restrictive select policy
CREATE POLICY "Users can view global or private companies" ON companies FOR SELECT USING (
  is_global = true OR id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
);
