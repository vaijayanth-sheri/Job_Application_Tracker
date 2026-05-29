-- ============================================
-- Job Application Tracker - Migration to Global Companies & Job Boards
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- It safely moves data to the new structure and updates tables.

-- 1. Create junction tables
CREATE TABLE IF NOT EXISTS user_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID NOT NULL, -- FK added later to avoid issues during migration
  interest_level INTEGER DEFAULT 3 CHECK (interest_level >= 1 AND interest_level <= 5),
  last_reviewed DATE DEFAULT CURRENT_DATE,
  linkedin_connections TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_job_boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_board_id UUID NOT NULL,
  last_browsed DATE DEFAULT CURRENT_DATE,
  keywords VARCHAR(100) DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Migrate data from current tables to new junction tables
INSERT INTO user_companies (user_id, company_id, interest_level, last_reviewed, linkedin_connections, notes, created_at, updated_at)
SELECT user_id, id, interest_level, last_reviewed, linkedin_connections, notes, created_at, updated_at
FROM companies;

INSERT INTO user_job_boards (user_id, job_board_id, last_browsed, keywords, notes, created_at, updated_at)
SELECT user_id, id, last_browsed, keywords, notes, created_at, updated_at
FROM job_boards;

-- 3. Drop existing dependent policies before dropping columns
DROP POLICY IF EXISTS "Users can view their own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert their own companies" ON companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON companies;

DROP POLICY IF EXISTS "Users can view their own job_boards" ON job_boards;
DROP POLICY IF EXISTS "Users can insert their own job_boards" ON job_boards;
DROP POLICY IF EXISTS "Users can update their own job_boards" ON job_boards;
DROP POLICY IF EXISTS "Users can delete their own job_boards" ON job_boards;

-- 4. Modify original tables to become global
ALTER TABLE companies
DROP COLUMN user_id CASCADE,
DROP COLUMN interest_level CASCADE,
DROP COLUMN last_reviewed CASCADE,
DROP COLUMN linkedin_connections CASCADE,
DROP COLUMN notes CASCADE;

ALTER TABLE job_boards
DROP COLUMN user_id CASCADE,
DROP COLUMN last_browsed CASCADE,
DROP COLUMN keywords CASCADE,
DROP COLUMN notes CASCADE;

-- 5. Add Foreign Key constraints now that data is migrated
ALTER TABLE user_companies
ADD CONSTRAINT fk_user_companies_company
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE user_job_boards
ADD CONSTRAINT fk_user_job_boards_job_board
FOREIGN KEY (job_board_id) REFERENCES job_boards(id) ON DELETE CASCADE;

-- 6. Update RLS on Global Tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- Global companies can be read by anyone (or just authenticated users)
CREATE POLICY "Anyone can view global companies" ON companies FOR SELECT USING (true);
-- Anyone authenticated can insert/update for now
CREATE POLICY "Authenticated users can insert global companies" ON companies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update global companies" ON companies FOR UPDATE USING (auth.uid() IS NOT NULL);

ALTER TABLE job_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view global job_boards" ON job_boards FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert global job_boards" ON job_boards FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update global job_boards" ON job_boards FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 7. Setup RLS for Junction Tables
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their user_companies"
  ON user_companies FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE user_job_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their user_job_boards"
  ON user_job_boards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. Triggers for updated_at
CREATE TRIGGER update_user_companies_updated_at
  BEFORE UPDATE ON user_companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_job_boards_updated_at
  BEFORE UPDATE ON user_job_boards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_job_boards_user_id ON user_job_boards(user_id);
