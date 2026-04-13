-- ============================================
-- Job Application Tracker - Supabase Schema
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)
-- ============================================

-- ==================
-- JOBS TABLE
-- ==================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  company TEXT DEFAULT '',
  applied_date DATE DEFAULT CURRENT_DATE,
  location TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'wishlist'
    CHECK (status IN ('wishlist', 'applied', 'interview', 'offer', 'rejected')),
  relevancy TEXT DEFAULT 'medium'
    CHECK (relevancy IN ('low', 'medium', 'high')),
  interest_level INTEGER DEFAULT 3
    CHECK (interest_level >= 1 AND interest_level <= 5),
  interview_stage TEXT DEFAULT '',
  job_link TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- JOB BOARDS TABLE
-- ==================
CREATE TABLE IF NOT EXISTS job_boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  site TEXT NOT NULL,
  link TEXT DEFAULT '',
  last_browsed DATE DEFAULT CURRENT_DATE,
  keywords TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- SKILLS TABLE
-- ==================
CREATE TABLE IF NOT EXISTS skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skill_name TEXT NOT NULL,
  category TEXT DEFAULT '',
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'to_learn'
    CHECK (status IN ('to_learn', 'in_progress', 'learned')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================
-- ROW LEVEL SECURITY
-- ==================

-- Enable RLS on all tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- Jobs policies
CREATE POLICY "Users can view their own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs"
  ON jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Job boards policies
CREATE POLICY "Users can view their own job_boards"
  ON job_boards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job_boards"
  ON job_boards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job_boards"
  ON job_boards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job_boards"
  ON job_boards FOR DELETE
  USING (auth.uid() = user_id);

-- Skills policies
CREATE POLICY "Users can view their own skills"
  ON skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skills"
  ON skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skills"
  ON skills FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skills"
  ON skills FOR DELETE
  USING (auth.uid() = user_id);

-- ==================
-- AUTO-UPDATE updated_at
-- ==================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================
-- INDEXES
-- ==================
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_applied_date ON jobs(applied_date);
CREATE INDEX IF NOT EXISTS idx_job_boards_user_id ON job_boards(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
