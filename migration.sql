-- ============================================
-- Job Application Tracker - Migration Script
-- ============================================
-- Run this in your Supabase SQL Editor to securely convert 
-- your existing text fields to optimized VARCHAR fields 
-- without losing any data.
-- ============================================

-- 1. JOBS
ALTER TABLE jobs 
  ALTER COLUMN title TYPE VARCHAR(100),
  ALTER COLUMN company TYPE VARCHAR(100),
  ALTER COLUMN location TYPE VARCHAR(50),
  ALTER COLUMN status TYPE VARCHAR(20),
  ALTER COLUMN relevancy TYPE VARCHAR(20),
  ALTER COLUMN interview_stage TYPE VARCHAR(50);

-- 2. COMPANIES
ALTER TABLE companies 
  ALTER COLUMN company_name TYPE VARCHAR(100),
  ALTER COLUMN sector TYPE VARCHAR(50),
  ALTER COLUMN location TYPE VARCHAR(50);

-- 3. JOB BOARDS
ALTER TABLE job_boards 
  ALTER COLUMN site TYPE VARCHAR(50),
  ALTER COLUMN keywords TYPE VARCHAR(100);

-- 4. SKILLS
ALTER TABLE skills 
  ALTER COLUMN skill_name TYPE VARCHAR(100),
  ALTER COLUMN category TYPE VARCHAR(50),
  ALTER COLUMN priority TYPE VARCHAR(20),
  ALTER COLUMN status TYPE VARCHAR(20);

-- ==================
-- TIMESTAMPS
-- Ensure job_boards and skills have updated_at
-- ==================
ALTER TABLE job_boards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE skills ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_job_boards_updated_at ON job_boards;
CREATE TRIGGER update_job_boards_updated_at
  BEFORE UPDATE ON job_boards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_skills_updated_at ON skills;
CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
